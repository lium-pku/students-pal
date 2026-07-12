import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import fs from 'fs'
import path from 'path'

// 测试用独立 vault 目录
const TEST_VAULT = path.join(process.cwd(), 'vault-test')

// 在加载 vault 模块前设置环境变量
vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof fs>()
  return actual
})

import { subjects, knowledge, thinking, wrongQuestions, chats, rebuildIndex } from '@/lib/vault'

// 重写 VAULT_DIR(通过环境变量或直接操作)
// 由于 VAULT_DIR 是模块加载时确定的,我们需要在测试前清空 vault/ 目录

const VAULT_DIR = path.join(process.cwd(), 'vault')

function cleanVault() {
  for (const subdir of ['subjects', 'knowledge', 'thinking', 'wrong', 'chats']) {
    const dir = path.join(VAULT_DIR, subdir)
    if (fs.existsSync(dir)) {
      for (const f of fs.readdirSync(dir)) {
        if (f.endsWith('.md')) fs.unlinkSync(path.join(dir, f))
      }
    }
  }
  const idx = path.join(VAULT_DIR, '.index.json')
  if (fs.existsSync(idx)) fs.unlinkSync(idx)
}

describe('lib/vault.ts', () => {
  beforeEach(() => {
    cleanVault()
    rebuildIndex()
  })

  afterEach(() => {
    cleanVault()
    rebuildIndex()
  })

  describe('subjects', () => {
    it('应创建并读取学科', () => {
      const s = subjects.create({ id: 'test_s1', name: '测试学科', color: '#ff0000', icon: '📚' })
      expect(s.id).toBe('test_s1')
      expect(s.name).toBe('测试学科')

      const got = subjects.get('test_s1')
      expect(got).not.toBeNull()
      expect(got!.name).toBe('测试学科')
      expect(got!.color).toBe('#ff0000')
    })

    it('应列出所有学科', () => {
      subjects.create({ id: 's1', name: '学科1' })
      subjects.create({ id: 's2', name: '学科2' })
      const list = subjects.list()
      expect(list).toHaveLength(2)
    })

    it('listWithCounts 应返回关联资源数', () => {
      subjects.create({ id: 's1', name: '数学' })
      knowledge.create({ id: 'k1', title: 'KP1', subjectId: 's1' })
      thinking.create({ id: 't1', title: 'T1', subjectId: 's1' })
      wrongQuestions.create({ id: 'w1', question: 'Q1', subjectId: 's1' })

      const list = subjects.listWithCounts()
      const math = list.find((s) => s.id === 's1')
      expect(math?._count.knowledgePoints).toBe(1)
      expect(math?._count.thinkingNotes).toBe(1)
      expect(math?._count.wrongQuestions).toBe(1)
    })

    it('应更新学科', () => {
      subjects.create({ id: 's1', name: '旧名' })
      const updated = subjects.update('s1', { name: '新名', color: '#00ff00' })
      expect(updated.name).toBe('新名')
      expect(updated.color).toBe('#00ff00')
    })

    it('应删除学科', () => {
      subjects.create({ id: 's1', name: '学科1' })
      subjects.delete('s1')
      expect(subjects.get('s1')).toBeNull()
    })

    it('应在不存在时返回 null', () => {
      expect(subjects.get('nonexistent')).toBeNull()
    })

    it('count 应返回学科数', () => {
      expect(subjects.count()).toBe(0)
      subjects.create({ id: 's1', name: 'S1' })
      expect(subjects.count()).toBe(1)
    })
  })

  describe('knowledge', () => {
    it('应创建并读取知识点', () => {
      const kp = knowledge.create({
        id: 'k1',
        title: '勾股定理',
        content: 'a² + b² = c²',
        tags: ['几何', '定理'],
        subjectId: 's1',
        mastery: 80,
      })
      expect(kp.id).toBe('k1')
      expect(kp.title).toBe('勾股定理')

      const got = knowledge.get('k1')
      expect(got).not.toBeNull()
      expect(got!.title).toBe('勾股定理')
      expect(got!.content).toBe('a² + b² = c²')
      expect(got!.tags).toEqual(['几何', '定理'])
      expect(got!.mastery).toBe(80)
    })

    it('应列出知识点', () => {
      knowledge.create({ id: 'k1', title: 'KP1' })
      knowledge.create({ id: 'k2', title: 'KP2' })
      expect(knowledge.list()).toHaveLength(2)
    })

    it('应支持按 subjectId 过滤', () => {
      knowledge.create({ id: 'k1', title: 'KP1', subjectId: 's1' })
      knowledge.create({ id: 'k2', title: 'KP2', subjectId: 's2' })
      const filtered = knowledge.list({ subjectId: 's1' })
      expect(filtered).toHaveLength(1)
      expect(filtered[0].id).toBe('k1')
    })

    it('应支持关键词搜索', () => {
      knowledge.create({ id: 'k1', title: '勾股定理', content: '直角三角形', tags: ['几何'] })
      knowledge.create({ id: 'k2', title: '数轴', content: '表示实数', tags: ['代数'] })
      const result = knowledge.list({ q: '勾股' })
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('k1')
    })

    it('应更新知识点', () => {
      knowledge.create({ id: 'k1', title: '旧标题', mastery: 50 })
      const updated = knowledge.update('k1', { title: '新标题', mastery: 90 })
      expect(updated.title).toBe('新标题')
      expect(updated.mastery).toBe(90)
    })

    it('应删除知识点', () => {
      knowledge.create({ id: 'k1', title: 'KP1' })
      knowledge.delete('k1')
      expect(knowledge.get('k1')).toBeNull()
    })

    it('应管理关联', () => {
      knowledge.create({ id: 'k1', title: 'KP1' })
      knowledge.create({ id: 'k2', title: 'KP2' })
      knowledge.addRelation({ fromId: 'k1', toId: 'k2', type: 'related', description: 'test' })

      const kp1 = knowledge.get('k1')
      expect(kp1!.relationsFrom).toHaveLength(1)
      expect(kp1!.relationsFrom[0].toId).toBe('k2')

      const kp2 = knowledge.get('k2')
      expect(kp2!.relationsTo).toHaveLength(1)
      expect(kp2!.relationsTo[0].fromId).toBe('k1')

      knowledge.removeRelationByEndpoints('k1', 'k2')
      const kp1After = knowledge.get('k1')
      expect(kp1After!.relationsFrom).toHaveLength(0)
    })

    it('aggregateMastery 应返回平均掌握度', () => {
      knowledge.create({ id: 'k1', title: 'KP1', mastery: 60 })
      knowledge.create({ id: 'k2', title: 'KP2', mastery: 80 })
      const agg = knowledge.aggregateMastery()
      expect(agg._avg.mastery).toBe(70)
    })

    it('aggregateMastery 应在无知识点时返回 null', () => {
      const agg = knowledge.aggregateMastery()
      expect(agg._avg.mastery).toBeNull()
    })
  })

  describe('thinking', () => {
    it('应创建并读取思考笔记', () => {
      const note = thinking.create({
        id: 't1',
        title: '为什么负负得正?',
        question: 'Q',
        content: '我的思考',
        subjectId: 's1',
      })
      expect(note.id).toBe('t1')
      expect(note.status).toBe('draft')

      const got = thinking.get('t1')
      expect(got).not.toBeNull()
      expect(got!.title).toBe('为什么负负得正?')
      expect(got!.content).toBe('我的思考')
      expect(got!.question).toBe('Q')
    })

    it('应更新笔记(含 AI 引导)', () => {
      thinking.create({ id: 't1', title: 'T1' })
      const updated = thinking.update('t1', {
        aiReflection: 'AI 引导内容',
        aiMode: 'socratic',
        status: 'reflected',
      })
      expect(updated.aiReflection).toBe('AI 引导内容')
      expect(updated.status).toBe('reflected')
    })

    it('应按状态过滤', () => {
      thinking.create({ id: 't1', title: 'T1' })
      thinking.create({ id: 't2', title: 'T2' })
      thinking.update('t2', { status: 'reflected' })
      const reflected = thinking.list({ status: 'reflected' })
      expect(reflected).toHaveLength(1)
      expect(reflected[0].id).toBe('t2')
    })
  })

  describe('wrongQuestions', () => {
    it('应创建并读取错题', () => {
      const wq = wrongQuestions.create({
        id: 'w1',
        question: '1+1=?',
        questionType: 'short',
        myAnswer: '3',
        correctAnswer: '2',
        subjectId: 's1',
      })
      expect(wq.id).toBe('w1')
      expect(wq.status).toBe('unresolved')

      const got = wrongQuestions.get('w1')
      expect(got).not.toBeNull()
      expect(got!.question).toBe('1+1=?')
      expect(got!.myAnswer).toBe('3')
      expect(got!.correctAnswer).toBe('2')
    })

    it('应更新错题(含 AI 解析)', () => {
      wrongQuestions.create({ id: 'w1', question: 'Q' })
      const updated = wrongQuestions.update('w1', {
        aiExplanation: '## 解析\n...',
        status: 'reviewed',
      })
      expect(updated.aiExplanation).toContain('解析')
      expect(updated.status).toBe('reviewed')
    })

    it('应按状态过滤', () => {
      wrongQuestions.create({ id: 'w1', question: 'Q1' })
      wrongQuestions.create({ id: 'w2', question: 'Q2' })
      wrongQuestions.update('w2', { status: 'mastered' })
      const mastered = wrongQuestions.list({ status: 'mastered' })
      expect(mastered).toHaveLength(1)
    })

    it('count 应支持状态过滤', () => {
      wrongQuestions.create({ id: 'w1', question: 'Q1' })
      wrongQuestions.create({ id: 'w2', question: 'Q2' })
      wrongQuestions.update('w2', { status: 'mastered' })
      expect(wrongQuestions.count()).toBe(2)
      expect(wrongQuestions.count({ status: 'mastered' })).toBe(1)
    })
  })

  describe('chats', () => {
    it('应创建会话并添加消息', () => {
      const session = chats.create({ id: 'c1', title: '测试对话' })
      expect(session.id).toBe('c1')
      expect(session.title).toBe('测试对话')
      expect(session.messages).toHaveLength(0)

      const msg = chats.addMessage('c1', {
        role: 'user',
        content: 'hello',
        meta: '',
        createdAt: new Date().toISOString(),
      })
      expect(msg.role).toBe('user')
      expect(msg.content).toBe('hello')

      const got = chats.get('c1')
      expect(got!.messages).toHaveLength(1)
      expect(got!.messages[0].content).toBe('hello')
    })

    it('应列出会话', () => {
      chats.create({ id: 'c1', title: '对话1' })
      chats.create({ id: 'c2', title: '对话2' })
      const list = chats.list()
      expect(list).toHaveLength(2)
    })

    it('应删除会话', () => {
      chats.create({ id: 'c1', title: 'T1' })
      chats.delete('c1')
      expect(chats.get('c1')).toBeNull()
    })
  })
})
