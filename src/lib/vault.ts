/**
 * vault.ts — Karpathy llm-wiki 式文件存储数据层
 *
 * 数据存储在 vault/ 目录下的 Markdown 文件中,每个实体一个文件:
 *   vault/subjects/数学.md
 *   vault/knowledge/勾股定理.md
 *   vault/thinking/为什么负负得正.md
 *   vault/wrong/负数乘法错题.md
 *   vault/chats/关于勾股定理的讨论.md
 *
 * 每个文件 = YAML frontmatter(元数据) + Markdown body(内容)
 *
 * AI 工具(Claude Code/Codex/Kimi)可直接读这些文件,无需 API。
 * UI 通过 .index.json 做快速查询。
 *
 * 文件命名:用实体 title 做 filename(sanitize 后),id 在 frontmatter 里。
 */

import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import crypto from 'crypto'

const VAULT_DIR = path.join(process.cwd(), 'vault')
const INDEX_FILE = path.join(VAULT_DIR, '.index.json')

// ============ 类型定义 ============

export interface Subject {
  id: string
  name: string
  color: string
  icon: string | null
  createdAt: string
  updatedAt: string
}

export interface KnowledgeRelation {
  id: string
  fromId: string
  toId: string
  type: string // prerequisite | extension | contrast | example | related
  description: string
  aiGenerated: boolean
  createdAt: string
}

export interface KnowledgePoint {
  id: string
  title: string
  content: string // Markdown body
  tags: string[]
  subjectId: string | null
  mastery: number
  relationsFrom: KnowledgeRelation[]
  relationsTo: KnowledgeRelation[]
  createdAt: string
  updatedAt: string
}

export interface ThinkingRelation {
  id: string          // 目标思考笔记 id
  type: string        // extends | contrasts | refutes | inspired-by
  description: string
}

export interface ThinkingNote {
  id: string
  title: string
  question: string
  content: string
  aiReflection: string
  aiMode: string
  status: string
  subjectId: string | null
  relatedKnowledgeIds: string[]
  relatedThinking: ThinkingRelation[]  // v2.2 新增:关联的其他思考笔记
  createdAt: string
  updatedAt: string
}

export interface WrongQuestion {
  id: string
  question: string
  questionType: string
  options: string
  myAnswer: string
  correctAnswer: string
  analysis: string
  aiExplanation: string
  status: string
  subjectId: string | null
  relatedKnowledgeId: string | null
  createdAt: string
  updatedAt: string
}

export interface ChatMessage {
  id: string
  sessionId: string
  role: string
  content: string
  meta: string
  createdAt: string
}

export interface ChatSession {
  id: string
  title: string
  context: string
  messages: ChatMessage[]
  createdAt: string
  updatedAt: string
}

// ============ 工具函数 ============

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

function sanitizeFilename(name: string): string {
  return name
    .replace(/[\/\\:*?"<>|]/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 100)
}

function generateId(prefix: string): string {
  return `${prefix}_${crypto.randomBytes(6).toString('hex')}`
}

function now(): string {
  return new Date().toISOString()
}

function readMarkdown<T>(filePath: string): { data: T; content: string } | null {
  if (!fs.existsSync(filePath)) return null
  const raw = fs.readFileSync(filePath, 'utf-8')
  const parsed = matter(raw)
  return { data: parsed.data as T, content: parsed.content.trim() }
}

function writeMarkdown(filePath: string, frontmatter: Record<string, any>, content: string = '') {
  ensureDir(path.dirname(filePath))
  const file = matter.stringify(content, frontmatter)
  fs.writeFileSync(filePath, file, 'utf-8')
}

function deleteFile(filePath: string) {
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
}

function listFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return []
  return fs.readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .map((f) => path.join(dir, f))
}

// ============ 索引管理 ============

interface VaultIndex {
  subjects: Array<{ id: string; name: string; file: string }>
  knowledge: Array<{ id: string; title: string; file: string; subjectId: string | null; mastery: number; tags: string[] }>
  thinking: Array<{ id: string; title: string; file: string; subjectId: string | null; status: string }>
  wrong: Array<{ id: string; file: string; subjectId: string | null; status: string; relatedKnowledgeId: string | null }>
  chats: Array<{ id: string; title: string; file: string }>
  updatedAt: string
}

let indexCache: VaultIndex | null = null

export function rebuildIndex(): VaultIndex {
  const index: VaultIndex = {
    subjects: [],
    knowledge: [],
    thinking: [],
    wrong: [],
    chats: [],
    updatedAt: now(),
  }

  // 扫描 subjects
  for (const file of listFiles(path.join(VAULT_DIR, 'subjects'))) {
    const parsed = readMarkdown<any>(file)
    if (parsed?.data?.id) {
      index.subjects.push({
        id: parsed.data.id,
        name: parsed.data.name || '',
        file: path.relative(VAULT_DIR, file),
      })
    }
  }

  // 扫描 knowledge
  for (const file of listFiles(path.join(VAULT_DIR, 'knowledge'))) {
    const parsed = readMarkdown<any>(file)
    if (parsed?.data?.id) {
      index.knowledge.push({
        id: parsed.data.id,
        title: parsed.data.title || '',
        file: path.relative(VAULT_DIR, file),
        subjectId: parsed.data.subject || null,
        mastery: parsed.data.mastery || 0,
        tags: parsed.data.tags || [],
      })
    }
  }

  // 扫描 thinking
  for (const file of listFiles(path.join(VAULT_DIR, 'thinking'))) {
    const parsed = readMarkdown<any>(file)
    if (parsed?.data?.id) {
      index.thinking.push({
        id: parsed.data.id,
        title: parsed.data.title || '',
        file: path.relative(VAULT_DIR, file),
        subjectId: parsed.data.subject || null,
        status: parsed.data.status || 'draft',
      })
    }
  }

  // 扫描 wrong
  for (const file of listFiles(path.join(VAULT_DIR, 'wrong'))) {
    const parsed = readMarkdown<any>(file)
    if (parsed?.data?.id) {
      index.wrong.push({
        id: parsed.data.id,
        file: path.relative(VAULT_DIR, file),
        subjectId: parsed.data.subject || null,
        status: parsed.data.status || 'unresolved',
        relatedKnowledgeId: parsed.data['related-knowledge'] || null,
      })
    }
  }

  // 扫描 chats
  for (const file of listFiles(path.join(VAULT_DIR, 'chats'))) {
    const parsed = readMarkdown<any>(file)
    if (parsed?.data?.id) {
      index.chats.push({
        id: parsed.data.id,
        title: parsed.data.title || '',
        file: path.relative(VAULT_DIR, file),
      })
    }
  }

  fs.writeFileSync(INDEX_FILE, JSON.stringify(index, null, 2), 'utf-8')
  indexCache = index
  return index
}

export function getIndex(): VaultIndex {
  // 每次都重建索引(不缓存),因为文件可能被外部(AI 工具/测试/手动)修改
  // 性能影响可接受(单用户场景,文件数量有限)
  return rebuildIndex()
}

function invalidateIndex() {
  indexCache = null
  // 删除索引文件,强制下次 getIndex 时重建
  if (fs.existsSync(INDEX_FILE)) {
    try { fs.unlinkSync(INDEX_FILE) } catch {}
  }
}

// ============ Subjects ============

export const subjects = {
  list(): Subject[] {
    const index = getIndex()
    return index.subjects
      .map((s) => {
        const parsed = readMarkdown<any>(path.join(VAULT_DIR, s.file))
        if (!parsed) return null
        return {
          id: s.id,
          name: s.name,
          color: parsed.data.color || '#16a34a',
          icon: parsed.data.icon || null,
          createdAt: parsed.data.created || now(),
          updatedAt: parsed.data.updated || now(),
        }
      })
      .filter(Boolean) as Subject[]
  },

  listWithCounts() {
    const index = getIndex()
    const subjList = subjects.list()
    return subjList.map((s) => ({
      ...s,
      _count: {
        knowledgePoints: index.knowledge.filter((k) => k.subjectId === s.id).length,
        wrongQuestions: index.wrong.filter((w) => w.subjectId === s.id).length,
        thinkingNotes: index.thinking.filter((t) => t.subjectId === s.id).length,
      },
    }))
  },

  get(id: string): Subject | null {
    const index = getIndex()
    const entry = index.subjects.find((s) => s.id === id)
    if (!entry) return null
    const parsed = readMarkdown<any>(path.join(VAULT_DIR, entry.file))
    if (!parsed) return null
    return {
      id,
      name: parsed.data.name,
      color: parsed.data.color || '#16a34a',
      icon: parsed.data.icon || null,
      createdAt: parsed.data.created || now(),
      updatedAt: parsed.data.updated || now(),
    }
  },

  create(data: { id?: string; name: string; color?: string; icon?: string | null }): Subject {
    const id = data.id || generateId('subj')
    const ts = now()
    const subject: Subject = {
      id,
      name: data.name,
      color: data.color || '#16a34a',
      icon: data.icon || null,
      createdAt: ts,
      updatedAt: ts,
    }
    const filename = `${sanitizeFilename(data.name)}.md`
    writeMarkdown(
      path.join(VAULT_DIR, 'subjects', filename),
      {
        id,
        type: 'subject',
        name: data.name,
        color: subject.color,
        icon: subject.icon,
        created: ts,
        updated: ts,
      },
      `# ${data.name}\n`,
    )
    invalidateIndex()
    return subject
  },

  update(id: string, data: Partial<Pick<Subject, 'name' | 'color' | 'icon'>>): Subject {
    const existing = subjects.get(id)
    if (!existing) throw new Error('Subject not found')
    const updated = { ...existing, ...data, updatedAt: now() }
    // 如果 name 变了,删除旧文件
    const index = getIndex()
    const entry = index.subjects.find((s) => s.id === id)
    if (entry) {
      const oldFile = path.join(VAULT_DIR, entry.file)
      const newFilename = `${sanitizeFilename(updated.name)}.md`
      if (entry.file !== newFilename) {
        deleteFile(oldFile)
      }
    }
    writeMarkdown(
      path.join(VAULT_DIR, 'subjects', `${sanitizeFilename(updated.name)}.md`),
      {
        id,
        type: 'subject',
        name: updated.name,
        color: updated.color,
        icon: updated.icon,
        created: updated.createdAt,
        updated: updated.updatedAt,
      },
      `# ${updated.name}\n`,
    )
    invalidateIndex()
    return updated
  },

  delete(id: string): void {
    const index = getIndex()
    const entry = index.subjects.find((s) => s.id === id)
    if (!entry) return
    deleteFile(path.join(VAULT_DIR, entry.file))
    // 关联的实体的 subjectId 置空(更新 frontmatter)
    for (const k of index.knowledge.filter((k) => k.subjectId === id)) {
      const kp = knowledge.get(k.id)
      if (kp) knowledge.update(k.id, { subjectId: null })
    }
    invalidateIndex()
  },

  count(): number {
    return getIndex().subjects.length
  },
}

// ============ Knowledge Points ============

export const knowledge = {
  list(filter?: { subjectId?: string; q?: string }): KnowledgePoint[] {
    const index = getIndex()
    let result: KnowledgePoint[] = []
    for (const entry of index.knowledge) {
      const kp = knowledge.get(entry.id)
      if (kp) result.push(kp)
    }
    if (filter?.subjectId) {
      result = result.filter((k) => k.subjectId === filter.subjectId)
    }
    if (filter?.q) {
      const q = filter.q.toLowerCase()
      result = result.filter(
        (k) =>
          k.title.toLowerCase().includes(q) ||
          k.content.toLowerCase().includes(q) ||
          k.tags.some((t) => t.toLowerCase().includes(q)),
      )
    }
    // 按 updatedAt 降序
    result.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    return result
  },

  get(id: string): KnowledgePoint | null {
    const index = getIndex()
    const entry = index.knowledge.find((k) => k.id === id)
    if (!entry) return null
    const parsed = readMarkdown<any>(path.join(VAULT_DIR, entry.file))
    if (!parsed) return null
    const allRelations = knowledge.getAllRelations()
    return {
      id,
      title: parsed.data.title,
      content: parsed.content,
      tags: parsed.data.tags || [],
      subjectId: parsed.data.subject || null,
      mastery: parsed.data.mastery || 0,
      relationsFrom: allRelations.filter((r) => r.fromId === id),
      relationsTo: allRelations.filter((r) => r.toId === id),
      createdAt: parsed.data.created || now(),
      updatedAt: parsed.data.updated || now(),
    }
  },

  create(data: {
    id?: string
    title: string
    content?: string
    tags?: string[]
    subjectId?: string | null
    mastery?: number
  }): KnowledgePoint {
    const id = data.id || generateId('kp')
    const ts = now()
    const kp: KnowledgePoint = {
      id,
      title: data.title,
      content: data.content || '',
      tags: data.tags || [],
      subjectId: data.subjectId || null,
      mastery: data.mastery || 0,
      relationsFrom: [],
      relationsTo: [],
      createdAt: ts,
      updatedAt: ts,
    }
    writeMarkdown(
      path.join(VAULT_DIR, 'knowledge', `${sanitizeFilename(data.title)}.md`),
      {
        id,
        type: 'knowledge-point',
        title: data.title,
        subject: data.subjectId || null,
        tags: kp.tags,
        mastery: kp.mastery,
        related: [],
        created: ts,
        updated: ts,
      },
      data.content || '',
    )
    invalidateIndex()
    return kp
  },

  update(id: string, data: Partial<KnowledgePoint>): KnowledgePoint {
    const existing = knowledge.get(id)
    if (!existing) throw new Error('Knowledge point not found')
    const updated = { ...existing, ...data, updatedAt: now() }
    // 如果 title 变了,重命名文件
    const index = getIndex()
    const entry = index.knowledge.find((k) => k.id === id)
    if (entry && existing.title !== updated.title) {
      deleteFile(path.join(VAULT_DIR, entry.file))
    }
    writeMarkdown(
      path.join(VAULT_DIR, 'knowledge', `${sanitizeFilename(updated.title)}.md`),
      {
        id,
        type: 'knowledge-point',
        title: updated.title,
        subject: updated.subjectId,
        tags: updated.tags,
        mastery: updated.mastery,
        related: existing.relationsFrom.map((r) => ({
          id: r.toId,
          type: r.type,
          description: r.description,
          'ai-generated': r.aiGenerated,
        })),
        created: updated.createdAt,
        updated: updated.updatedAt,
      },
      updated.content,
    )
    invalidateIndex()
    return updated
  },

  delete(id: string): void {
    const index = getIndex()
    const entry = index.knowledge.find((k) => k.id === id)
    if (!entry) return
    deleteFile(path.join(VAULT_DIR, entry.file))
    // 删除所有关联
    knowledge.getAllRelations()
      .filter((r) => r.fromId === id || r.toId === id)
      .forEach((r) => knowledge.removeRelation(r.id))
    invalidateIndex()
  },

  // ============ 关联管理 ============

  getAllRelations(): KnowledgeRelation[] {
    const index = getIndex()
    const relations: KnowledgeRelation[] = []
    for (const entry of index.knowledge) {
      const parsed = readMarkdown<any>(path.join(VAULT_DIR, entry.file))
      if (parsed?.data?.related && Array.isArray(parsed.data.related)) {
        for (const r of parsed.data.related) {
          relations.push({
            id: generateId('rel'), // 临时生成,实际用 fromId+toId 标识
            fromId: entry.id,
            toId: r.id,
            type: r.type || 'related',
            description: r.description || '',
            aiGenerated: r['ai-generated'] || false,
            createdAt: parsed.data.created || now(),
          })
        }
      }
    }
    return relations
  },

  findRelationsByFromId(fromId: string): KnowledgeRelation[] {
    return knowledge.getAllRelations().filter((r) => r.fromId === fromId)
  },

  addRelation(data: {
    fromId: string
    toId: string
    type: string
    description?: string
    aiGenerated?: boolean
  }): KnowledgeRelation {
    const kp = knowledge.get(data.fromId)
    if (!kp) throw new Error('Knowledge point not found')
    const relationsFrom = kp.relationsFrom.map((r) => ({
      id: r.toId,
      type: r.type,
      description: r.description,
      'ai-generated': r.aiGenerated,
    }))
    relationsFrom.push({
      id: data.toId,
      type: data.type,
      description: data.description || '',
      'ai-generated': data.aiGenerated || false,
    })
    // 重写文件,保留其他字段
    const index = getIndex()
    const entry = index.knowledge.find((k) => k.id === data.fromId)!
    const parsed = readMarkdown<any>(path.join(VAULT_DIR, entry.file))
    if (!parsed) return null
    writeMarkdown(
      path.join(VAULT_DIR, entry.file),
      { ...parsed.data, related: relationsFrom, updated: now() },
      parsed.content,
    )
    invalidateIndex()
    return {
      id: generateId('rel'),
      fromId: data.fromId,
      toId: data.toId,
      type: data.type,
      description: data.description || '',
      aiGenerated: data.aiGenerated || false,
      createdAt: now(),
    }
  },

  removeRelation(_relId: string): void {
    // relId 是临时生成的,实际用 fromId+toId 标识
    // 这里简化:调用方需提供 fromId 和 toId
    // 由于接口限制,这个方法在文件模型下需要重新设计
    // 暂时保留空实现,由 removeRelationByEndpoints 替代
  },

  removeRelationByEndpoints(fromId: string, toId: string): void {
    const kp = knowledge.get(fromId)
    if (!kp) return
    const relationsFrom = kp.relationsFrom
      .filter((r) => r.toId !== toId)
      .map((r) => ({
        id: r.toId,
        type: r.type,
        description: r.description,
        'ai-generated': r.aiGenerated,
      }))
    const index = getIndex()
    const entry = index.knowledge.find((k) => k.id === fromId)!
    const parsed = readMarkdown<any>(path.join(VAULT_DIR, entry.file))
    if (!parsed) return null
    writeMarkdown(
      path.join(VAULT_DIR, entry.file),
      { ...parsed.data, related: relationsFrom, updated: now() },
      parsed.content,
    )
    invalidateIndex()
  },

  count(): number {
    return getIndex().knowledge.length
  },

  aggregateMastery(): { _avg: { mastery: number | null } } {
    const index = getIndex()
    if (index.knowledge.length === 0) return { _avg: { mastery: null } }
    const avg = index.knowledge.reduce((sum, k) => sum + (k.mastery || 0), 0) / index.knowledge.length
    return { _avg: { mastery: avg } }
  },
}

// ============ Thinking Notes ============

export const thinking = {
  list(filter?: { subjectId?: string; status?: string; q?: string }): ThinkingNote[] {
    const index = getIndex()
    let result: ThinkingNote[] = []
    for (const entry of index.thinking) {
      const note = thinking.get(entry.id)
      if (note) result.push(note)
    }
    if (filter?.subjectId) result = result.filter((t) => t.subjectId === filter.subjectId)
    if (filter?.status) result = result.filter((t) => t.status === filter.status)
    if (filter?.q) {
      const q = filter.q.toLowerCase()
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.content.toLowerCase().includes(q) ||
          t.question.toLowerCase().includes(q),
      )
    }
    result.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    return result
  },

  get(id: string): ThinkingNote | null {
    const index = getIndex()
    const entry = index.thinking.find((t) => t.id === id)
    if (!entry) return null
    const parsed = readMarkdown<any>(path.join(VAULT_DIR, entry.file))
    if (!parsed) return null
    return {
      id,
      title: parsed.data.title,
      question: parsed.data.question || '',
      content: parsed.content,
      aiReflection: parsed.data['ai-reflection'] || '',
      aiMode: parsed.data['ai-mode'] || 'socratic',
      status: parsed.data.status || 'draft',
      subjectId: parsed.data.subject || null,
      relatedKnowledgeIds: parsed.data['related-knowledge'] || [],
      relatedThinking: parsed.data['related-thinking'] || [],
      createdAt: parsed.data.created || now(),
      updatedAt: parsed.data.updated || now(),
    }
  },

  create(data: {
    id?: string
    title: string
    question?: string
    content?: string
    subjectId?: string | null
  }): ThinkingNote {
    const id = data.id || generateId('thinking')
    const ts = now()
    const note: ThinkingNote = {
      id,
      title: data.title,
      question: data.question || '',
      content: data.content || '',
      aiReflection: '',
      aiMode: 'socratic',
      status: 'draft',
      subjectId: data.subjectId || null,
      relatedKnowledgeIds: [],
      relatedThinking: [],
      createdAt: ts,
      updatedAt: ts,
    }
    writeMarkdown(
      path.join(VAULT_DIR, 'thinking', `${sanitizeFilename(data.title)}.md`),
      {
        id,
        type: 'thinking-note',
        title: data.title,
        subject: data.subjectId || null,
        status: 'draft',
        'ai-mode': 'socratic',
        'ai-reflection': '',
        'related-knowledge': [],
        'related-thinking': [],
        question: data.question || '',
        created: ts,
        updated: ts,
      },
      data.content || '',
    )
    invalidateIndex()
    return note
  },

  update(id: string, data: Partial<ThinkingNote>): ThinkingNote {
    const existing = thinking.get(id)
    if (!existing) throw new Error('Thinking note not found')
    const updated = { ...existing, ...data, updatedAt: now() }
    const index = getIndex()
    const entry = index.thinking.find((t) => t.id === id)!
    // 如果 title 变了,重命名文件
    if (existing.title !== updated.title) {
      deleteFile(path.join(VAULT_DIR, entry.file))
    }
    const parsed = readMarkdown<any>(path.join(VAULT_DIR, entry.file)) || { data: {}, content: '' }
    writeMarkdown(
      path.join(VAULT_DIR, 'thinking', `${sanitizeFilename(updated.title)}.md`),
      {
        id,
        type: 'thinking-note',
        title: updated.title,
        subject: updated.subjectId,
        status: updated.status,
        'ai-mode': updated.aiMode,
        'ai-reflection': updated.aiReflection,
        'related-knowledge': updated.relatedKnowledgeIds,
        'related-thinking': updated.relatedThinking || [],
        question: updated.question,
        created: updated.createdAt,
        updated: updated.updatedAt,
      },
      updated.content,
    )
    invalidateIndex()
    return updated
  },

  delete(id: string): void {
    const index = getIndex()
    const entry = index.thinking.find((t) => t.id === id)
    if (!entry) return
    deleteFile(path.join(VAULT_DIR, entry.file))
    invalidateIndex()
  },

  count(): number {
    return getIndex().thinking.length
  },

  findRecent(since: Date): ThinkingNote[] {
    return thinking.list().filter((t) => new Date(t.createdAt) >= since)
  },
}

// ============ Wrong Questions ============

export const wrongQuestions = {
  list(filter?: { subjectId?: string; status?: string; q?: string }): WrongQuestion[] {
    const index = getIndex()
    let result: WrongQuestion[] = []
    for (const entry of index.wrong) {
      const wq = wrongQuestions.get(entry.id)
      if (wq) result.push(wq)
    }
    if (filter?.subjectId) result = result.filter((w) => w.subjectId === filter.subjectId)
    if (filter?.status) result = result.filter((w) => w.status === filter.status)
    if (filter?.q) {
      const q = filter.q.toLowerCase()
      result = result.filter(
        (w) => w.question.toLowerCase().includes(q) || w.analysis.toLowerCase().includes(q),
      )
    }
    result.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    return result
  },

  get(id: string): WrongQuestion | null {
    const index = getIndex()
    const entry = index.wrong.find((w) => w.id === id)
    if (!entry) return null
    const parsed = readMarkdown<any>(path.join(VAULT_DIR, entry.file))
    if (!parsed) return null
    return {
      id,
      question: parsed.content.match(/^## 题目\n([\s\S]*?)(\n##|$)/m)?.[1]?.trim() || '',
      questionType: parsed.data['question-type'] || 'short',
      options: parsed.data.options || '',
      myAnswer: parsed.data['my-answer'] || '',
      correctAnswer: parsed.data['correct-answer'] || '',
      analysis: parsed.content.match(/^## 我的错因分析\n([\s\S]*?)(\n##|$)/m)?.[1]?.trim() || '',
      aiExplanation: parsed.data['ai-explanation'] || '',
      status: parsed.data.status || 'unresolved',
      subjectId: parsed.data.subject || null,
      relatedKnowledgeId: parsed.data['related-knowledge'] || null,
      createdAt: parsed.data.created || now(),
      updatedAt: parsed.data.updated || now(),
    }
  },

  create(data: {
    id?: string
    question: string
    questionType?: string
    options?: string
    myAnswer?: string
    correctAnswer?: string
    analysis?: string
    subjectId?: string | null
    relatedKnowledgeId?: string | null
  }): WrongQuestion {
    const id = data.id || generateId('wq')
    const ts = now()
    const wq: WrongQuestion = {
      id,
      question: data.question,
      questionType: data.questionType || 'short',
      options: data.options || '',
      myAnswer: data.myAnswer || '',
      correctAnswer: data.correctAnswer || '',
      analysis: data.analysis || '',
      aiExplanation: '',
      status: 'unresolved',
      subjectId: data.subjectId || null,
      relatedKnowledgeId: data.relatedKnowledgeId || null,
      createdAt: ts,
      updatedAt: ts,
    }
    const filename = `${sanitizeFilename(data.question.slice(0, 40))}.md`
    writeMarkdown(
      path.join(VAULT_DIR, 'wrong', filename),
      {
        id,
        type: 'wrong-question',
        subject: data.subjectId || null,
        'question-type': wq.questionType,
        options: wq.options,
        'my-answer': wq.myAnswer,
        'correct-answer': wq.correctAnswer,
        status: 'unresolved',
        'related-knowledge': data.relatedKnowledgeId || null,
        'ai-explanation': '',
        created: ts,
        updated: ts,
      },
      `## 题目\n${data.question}\n\n## 我的错因分析\n${data.analysis || ''}\n`,
    )
    invalidateIndex()
    return wq
  },

  update(id: string, data: Partial<WrongQuestion>): WrongQuestion {
    const existing = wrongQuestions.get(id)
    if (!existing) throw new Error('Wrong question not found')
    const updated = { ...existing, ...data, updatedAt: now() }
    const index = getIndex()
    const entry = index.wrong.find((w) => w.id === id)!
    const parsed = readMarkdown<any>(path.join(VAULT_DIR, entry.file))
    if (!parsed) return null
    writeMarkdown(
      path.join(VAULT_DIR, entry.file),
      {
        ...parsed.data,
        subject: updated.subjectId,
        'question-type': updated.questionType,
        options: updated.options,
        'my-answer': updated.myAnswer,
        'correct-answer': updated.correctAnswer,
        status: updated.status,
        'related-knowledge': updated.relatedKnowledgeId,
        'ai-explanation': updated.aiExplanation,
        updated: updated.updatedAt,
      },
      `## 题目\n${updated.question}\n\n## 我的错因分析\n${updated.analysis}\n`,
    )
    invalidateIndex()
    return updated
  },

  delete(id: string): void {
    const index = getIndex()
    const entry = index.wrong.find((w) => w.id === id)
    if (!entry) return
    deleteFile(path.join(VAULT_DIR, entry.file))
    invalidateIndex()
  },

  count(filter?: { status?: string }): number {
    const all = getIndex().wrong
    if (filter?.status) return all.filter((w) => w.status === filter.status).length
    return all.length
  },

  findRecent(since: Date): WrongQuestion[] {
    return wrongQuestions.list().filter((w) => new Date(w.createdAt) >= since)
  },
}

// ============ Chat Sessions ============

export const chats = {
  list(): ChatSession[] {
    const index = getIndex()
    const result: ChatSession[] = []
    for (const entry of index.chats) {
      const session = chats.get(entry.id)
      if (session) result.push(session)
    }
    result.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    return result
  },

  get(id: string): ChatSession | null {
    const index = getIndex()
    const entry = index.chats.find((c) => c.id === id)
    if (!entry) return null
    const parsed = readMarkdown<any>(path.join(VAULT_DIR, entry.file))
    if (!parsed) return null
    // 解析消息(从 body 中)
    const messages: ChatMessage[] = []
    const msgRegex = /^## 👤 (.*?)\n([\s\S]*?)(?=\n## |$)/gm
    const aiRegex = /^## 🤖 (.*?)\n([\s\S]*?)(?=\n## |$)/gm
    // 简化:用 messages 数组存 frontmatter 更可靠
    const rawMessages = parsed.data.messages || []
    for (const m of rawMessages) {
      messages.push({
        id: m.id,
        sessionId: id,
        role: m.role,
        content: m.content,
        meta: m.meta || '',
        createdAt: m.createdAt || now(),
      })
    }
    return {
      id,
      title: parsed.data.title,
      context: parsed.data.context || '',
      messages,
      createdAt: parsed.data.created || now(),
      updatedAt: parsed.data.updated || now(),
    }
  },

  create(data: { id?: string; title?: string; context?: string }): ChatSession {
    const id = data.id || generateId('chat')
    const ts = now()
    const session: ChatSession = {
      id,
      title: data.title || '新对话',
      context: data.context || '',
      messages: [],
      createdAt: ts,
      updatedAt: ts,
    }
    writeMarkdown(
      path.join(VAULT_DIR, 'chats', `${sanitizeFilename(session.title)}.md`),
      {
        id,
        type: 'chat-session',
        title: session.title,
        context: session.context,
        messages: [],
        created: ts,
        updated: ts,
      },
      `# ${session.title}\n`,
    )
    invalidateIndex()
    return session
  },

  update(id: string, data: Partial<ChatSession>): ChatSession {
    const existing = chats.get(id)
    if (!existing) throw new Error('Chat session not found')
    const updated = { ...existing, ...data, updatedAt: now() }
    const index = getIndex()
    const entry = index.chats.find((c) => c.id === id)!
    const parsed = readMarkdown<any>(path.join(VAULT_DIR, entry.file))
    if (!parsed) return null
    writeMarkdown(
      path.join(VAULT_DIR, entry.file),
      {
        ...parsed.data,
        title: updated.title,
        context: updated.context,
        messages: updated.messages.map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          meta: m.meta,
          createdAt: m.createdAt,
        })),
        updated: updated.updatedAt,
      },
      `# ${updated.title}\n`,
    )
    invalidateIndex()
    return updated
  },

  delete(id: string): void {
    const index = getIndex()
    const entry = index.chats.find((c) => c.id === id)
    if (!entry) return
    deleteFile(path.join(VAULT_DIR, entry.file))
    invalidateIndex()
  },

  addMessage(sessionId: string, msg: Omit<ChatMessage, 'id' | 'sessionId'>): ChatMessage {
    const session = chats.get(sessionId)
    if (!session) throw new Error('Chat session not found')
    const newMsg: ChatMessage = {
      ...msg,
      id: generateId('msg'),
      sessionId,
    }
    session.messages.push(newMsg)
    chats.update(sessionId, { messages: session.messages })
    return newMsg
  },
}

// ============ 初始化 ============

export function initVault() {
  ensureDir(VAULT_DIR)
  ensureDir(path.join(VAULT_DIR, 'subjects'))
  ensureDir(path.join(VAULT_DIR, 'knowledge'))
  ensureDir(path.join(VAULT_DIR, 'thinking'))
  ensureDir(path.join(VAULT_DIR, 'wrong'))
  ensureDir(path.join(VAULT_DIR, 'chats'))
  if (!fs.existsSync(INDEX_FILE)) {
    rebuildIndex()
  } else {
    getIndex()
  }
}

// 启动时初始化
initVault()
