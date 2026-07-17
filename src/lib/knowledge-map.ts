/**
 * knowledge-map.ts — 知识地图生成引擎
 * 力导向布局(Fruchterman-Reingold 简化版,100 次迭代)
 * 缓存到 vault/.maps/{subjectId}.json
 */
import fs from 'fs'
import path from 'path'
import { knowledge, subjects } from './vault'

const MAPS_DIR = path.join(process.cwd(), 'vault', '.maps')
const CANVAS_WIDTH = 800
const CANVAS_HEIGHT = 600
const ITERATIONS = 100
const REPULSION = 8000
const ATTRACTION = 0.05
const CENTER_GRAVITY = 0.01
const MAX_DISPLACEMENT = 50
const MIN_RADIUS = 16
const MAX_RADIUS = 28

export interface MapNode {
  id: string; title: string; mastery: number; x: number; y: number; radius: number; relationCount: number
}
export interface MapEdge {
  from: string; to: string; type: string; description: string; aiGenerated: boolean
}
export interface KnowledgeMap {
  subjectId: string; subjectName: string; nodes: MapNode[]; edges: MapEdge[]; generatedAt: string
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
  if (allKp.length === 0) return { subjectId, subjectName: subj.name, nodes: [], edges: [], generatedAt: new Date().toISOString() }
  const nodeIds = new Set(allKp.map(k => k.id))
  const edges: MapEdge[] = []
  for (const kp of allKp) for (const r of kp.relationsFrom) if (nodeIds.has(r.toId)) edges.push({ from: r.fromId, to: r.toId, type: r.type, description: r.description, aiGenerated: r.aiGenerated })
  const relCount = new Map<string, number>()
  for (const kp of allKp) relCount.set(kp.id, 0)
  for (const e of edges) { relCount.set(e.from, (relCount.get(e.from) || 0) + 1); relCount.set(e.to, (relCount.get(e.to) || 0) + 1) }
  const nodes: MapNode[] = allKp.map(kp => ({ id: kp.id, title: kp.title, mastery: kp.mastery, x: 0, y: 0, radius: MIN_RADIUS + Math.min(relCount.get(kp.id) || 0, 5) * ((MAX_RADIUS - MIN_RADIUS) / 5), relationCount: relCount.get(kp.id) || 0 }))
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
