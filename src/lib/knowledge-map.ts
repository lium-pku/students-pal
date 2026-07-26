/**
 * knowledge-map.ts — 知识地图生成引擎(v2.2 扩展)
 *
 * 节点类型:
 *   - knowledge(知识点,圆形)
 *   - thinking(思考笔记,方形)
 *   - wrong(错题,三角形)
 *
 * 边类型:
 *   - 知识点间:prerequisite / extension / contrast / example / related
 *   - 知识点→思考:has-thinking
 *   - 知识点→错题:has-wrong
 *   - 思考→思考:extends / contrasts / refutes / inspired-by
 *
 * 只显示有关联的思考/错题(related-knowledge 或 related-thinking 不为空)
 */
import fs from 'fs'
import path from 'path'
import { knowledge, subjects, thinking, wrongQuestions } from './vault'

const MAPS_DIR = path.join(process.cwd(), 'vault', '.maps')
const CANVAS_WIDTH = 800
const CANVAS_HEIGHT = 600
const ITERATIONS = 100
const REPULSION = 8000
const ATTRACTION = 0.05
const CENTER_GRAVITY = 0.01
const MAX_DISPLACEMENT = 50
const MIN_RADIUS = 14
const MAX_RADIUS = 26
const SECONDARY_RADIUS = 16  // 思考/错题节点固定大小

export type NodeType = 'knowledge' | 'thinking' | 'wrong'

export interface MapNode {
  id: string
  type: NodeType
  title: string
  mastery?: number      // 知识点专用
  status?: string       // 思考/错题专用
  x: number
  y: number
  radius: number
  relationCount: number
}

export interface MapEdge {
  from: string
  to: string
  type: string
  description: string
  aiGenerated?: boolean
}

export interface KnowledgeMap {
  subjectId: string
  subjectName: string
  nodes: MapNode[]
  edges: MapEdge[]
  generatedAt: string
}

function ensureMapsDir() { if (!fs.existsSync(MAPS_DIR)) fs.mkdirSync(MAPS_DIR, { recursive: true }) }
function getMapFilePath(subjectId: string) { return path.join(MAPS_DIR, `${subjectId}.json`) }

function seededRandom(seed: string): () => number {
  let h = 1779033703 ^ seed.length
  for (let i = 0; i < seed.length; i++) { h = Math.imul(h ^ seed.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19) }
  return () => { h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); h ^= h >>> 16; return (h >>> 0) / 4294967296 }
}

function runForceLayout(nodes: MapNode[], edges: MapEdge[]) {
  if (nodes.length === 0) return
  const rand = seededRandom(nodes.map(n => n.id).sort().join('|'))
  const cx = CANVAS_WIDTH / 2, cy = CANVAS_HEIGHT / 2, r = Math.min(CANVAS_WIDTH, CANVAS_HEIGHT) * 0.35
  for (const n of nodes) { const a = rand() * Math.PI * 2; const rr = r * (0.5 + rand() * 0.5); n.x = cx + rr * Math.cos(a); n.y = cy + rr * Math.sin(a) }
  const nodeMap = new Map(nodes.map(n => [n.id, n]))
  for (let iter = 0; iter < ITERATIONS; iter++) {
    const disp = new Map<string, { dx: number; dy: number }>()
    for (const n of nodes) disp.set(n.id, { dx: 0, dy: 0 })
    const temp = MAX_DISPLACEMENT * (1 - iter / ITERATIONS)
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        let dx = nodes[i].x - nodes[j].x, dy = nodes[i].y - nodes[j].y
        let dist = Math.sqrt(dx * dx + dy * dy) || 1
        const f = REPULSION / (dist * dist)
        disp.get(nodes[i].id)!.dx += (dx / dist) * f; disp.get(nodes[i].id)!.dy += (dy / dist) * f
        disp.get(nodes[j].id)!.dx -= (dx / dist) * f; disp.get(nodes[j].id)!.dy -= (dy / dist) * f
      }
    }
    for (const e of edges) {
      const a = nodeMap.get(e.from), b = nodeMap.get(e.to)
      if (!a || !b) continue
      let dx = a.x - b.x, dy = a.y - b.y; let dist = Math.sqrt(dx * dx + dy * dy) || 1
      const f = ATTRACTION * dist
      disp.get(a.id)!.dx -= (dx / dist) * f; disp.get(a.id)!.dy -= (dy / dist) * f
      disp.get(b.id)!.dx += (dx / dist) * f; disp.get(b.id)!.dy += (dy / dist) * f
    }
    for (const n of nodes) { disp.get(n.id)!.dx += (cx - n.x) * CENTER_GRAVITY; disp.get(n.id)!.dy += (cy - n.y) * CENTER_GRAVITY }
    for (const n of nodes) {
      const d = disp.get(n.id)!; const dist = Math.sqrt(d.dx * d.dx + d.dy * d.dy)
      if (dist > 0) { const lim = Math.min(dist, temp); n.x += (d.dx / dist) * lim; n.y += (d.dy / dist) * lim }
      n.x = Math.max(40, Math.min(CANVAS_WIDTH - 40, n.x)); n.y = Math.max(40, Math.min(CANVAS_HEIGHT - 40, n.y))
    }
  }
}

function buildMap(subjectId: string): KnowledgeMap | null {
  const subj = subjects.get(subjectId)
  if (!subj) return null

  const allKp = knowledge.list({ subjectId })
  if (allKp.length === 0) {
    return { subjectId, subjectName: subj.name, nodes: [], edges: [], generatedAt: new Date().toISOString() }
  }

  // 收集所有节点 id(知识点 + 相关思考 + 相关错题)
  const kpIds = new Set(allKp.map(k => k.id))
  const edges: MapEdge[] = []
  const nodes: MapNode[] = []

  // 1. 知识点节点 + 知识点间关联
  for (const kp of allKp) {
    for (const r of kp.relationsFrom) {
      if (kpIds.has(r.toId)) {
        edges.push({ from: r.fromId, to: r.toId, type: r.type, description: r.description, aiGenerated: r.aiGenerated })
      }
    }
  }

  // 2. 思考笔记节点(只显示有关联的)
  const allThinking = thinking.list({ subjectId })
  const relevantThinking = allThinking.filter(t =>
    (t.relatedKnowledgeIds && t.relatedKnowledgeIds.length > 0) ||
    (t.relatedThinking && t.relatedThinking.length > 0)
  )
  const thinkingIds = new Set(relevantThinking.map(t => t.id))

  for (const t of relevantThinking) {
    // 知识点 → 思考的边
    if (t.relatedKnowledgeIds) {
      for (const kpId of t.relatedKnowledgeIds) {
        if (kpIds.has(kpId)) {
          edges.push({ from: kpId, to: t.id, type: 'has-thinking', description: '', aiGenerated: false })
        }
      }
    }
    // 思考 → 思考的边
    if (t.relatedThinking) {
      for (const rt of t.relatedThinking) {
        if (thinkingIds.has(rt.id)) {
          edges.push({ from: t.id, to: rt.id, type: rt.type, description: rt.description || '', aiGenerated: false })
        }
      }
    }
  }

  // 3. 错题节点(只显示有关联的)
  const allWrong = wrongQuestions.list({ subjectId })
  const relevantWrong = allWrong.filter(w => w.relatedKnowledgeId && kpIds.has(w.relatedKnowledgeId))
  const wrongIds = new Set(relevantWrong.map(w => w.id))

  for (const w of relevantWrong) {
    if (w.relatedKnowledgeId && kpIds.has(w.relatedKnowledgeId)) {
      edges.push({ from: w.relatedKnowledgeId, to: w.id, type: 'has-wrong', description: '', aiGenerated: false })
    }
  }

  // 4. 计算关联数(用于知识点节点大小)
  const relCount = new Map<string, number>()
  for (const kp of allKp) relCount.set(kp.id, 0)
  for (const e of edges) {
    relCount.set(e.from, (relCount.get(e.from) || 0) + 1)
    relCount.set(e.to, (relCount.get(e.to) || 0) + 1)
  }

  // 5. 构建节点
  for (const kp of allKp) {
    nodes.push({
      id: kp.id, type: 'knowledge', title: kp.title, mastery: kp.mastery,
      x: 0, y: 0,
      radius: MIN_RADIUS + Math.min(relCount.get(kp.id) || 0, 5) * ((MAX_RADIUS - MIN_RADIUS) / 5),
      relationCount: relCount.get(kp.id) || 0,
    })
  }
  for (const t of relevantThinking) {
    nodes.push({
      id: t.id, type: 'thinking', title: t.title, status: t.status,
      x: 0, y: 0, radius: SECONDARY_RADIUS, relationCount: (relCount.get(t.id) || 0),
    })
  }
  for (const w of relevantWrong) {
    nodes.push({
      id: w.id, type: 'wrong', title: w.question.slice(0, 20), status: w.status,
      x: 0, y: 0, radius: SECONDARY_RADIUS, relationCount: (relCount.get(w.id) || 0),
    })
  }

  runForceLayout(nodes, edges)
  return { subjectId, subjectName: subj.name, nodes, edges, generatedAt: new Date().toISOString() }
}

export const knowledgeMap = {
  get(subjectId: string): KnowledgeMap | null {
    ensureMapsDir()
    const f = getMapFilePath(subjectId)
    if (fs.existsSync(f)) { try { return JSON.parse(fs.readFileSync(f, 'utf-8')) } catch {} }
    return knowledgeMap.generate(subjectId)
  },
  generate(subjectId: string): KnowledgeMap | null {
    ensureMapsDir()
    const m = buildMap(subjectId)
    if (m) fs.writeFileSync(getMapFilePath(subjectId), JSON.stringify(m, null, 2), 'utf-8')
    return m
  },
  invalidate(subjectId?: string) {
    ensureMapsDir()
    if (subjectId) { const f = getMapFilePath(subjectId); if (fs.existsSync(f)) fs.unlinkSync(f) }
    else if (fs.existsSync(MAPS_DIR)) for (const f of fs.readdirSync(MAPS_DIR)) if (f.endsWith('.json')) fs.unlinkSync(path.join(MAPS_DIR, f))
  },
}
