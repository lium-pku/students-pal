/**
 * knowledge-map.ts — 知识地图生成引擎
 *
 * 功能:
 *   1. 从 vault 读取指定学科的知识点 + 关联
 *   2. 用力导向布局算法计算节点位置
 *   3. 将布局结果缓存到 vault/.maps/{subjectId}.json
 *   4. 提供 get / generate 接口
 *
 * 力导向布局(简化版 Fruchterman-Reingold):
 *   - 斥力:所有节点对之间互相排斥(距离越近斥力越大)
 *   - 引力:有边相连的节点互相吸引(距离越远引力越大)
 *   - 中心引力:所有节点被拉向画布中心(防止飞散)
 *   - 迭代 100 次后收敛
 */

import fs from 'fs'
import path from 'path'
import { knowledge, subjects } from './vault'

const MAPS_DIR = path.join(process.cwd(), 'vault', '.maps')

export interface MapNode {
  id: string
  title: string
  mastery: number
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
  aiGenerated: boolean
}

export interface KnowledgeMap {
  subjectId: string
  subjectName: string
  nodes: MapNode[]
  edges: MapEdge[]
  generatedAt: string
}

// ============ 布局参数 ============

const CANVAS_WIDTH = 800
const CANVAS_HEIGHT = 600
const ITERATIONS = 100
const REPULSION = 8000       // 斥力强度
const ATTRACTION = 0.05      // 引力强度
const CENTER_GRAVITY = 0.01  // 中心引力
const MAX_DISPLACEMENT = 50  // 单次迭代最大位移
const MIN_RADIUS = 16
const MAX_RADIUS = 28

// ============ 工具函数 ============

function ensureMapsDir() {
  if (!fs.existsSync(MAPS_DIR)) {
    fs.mkdirSync(MAPS_DIR, { recursive: true })
  }
}

function getMapFilePath(subjectId: string): string {
  return path.join(MAPS_DIR, `${subjectId}.json`)
}

// 简单的伪随机数生成器(用 id 做 seed,保证同一份数据生成相同布局)
function seededRandom(seed: string): () => number {
  let h = 1779033703 ^ seed.length
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  return function () {
    h = Math.imul(h ^ (h >>> 16), 2246822507)
    h = Math.imul(h ^ (h >>> 13), 3266489909)
    h ^= h >>> 16
    return (h >>> 0) / 4294967296
  }
}

// ============ 力导向布局 ============

function runForceLayout(nodes: MapNode[], edges: MapEdge[]): void {
  if (nodes.length === 0) return

  // 用所有节点 id 拼接做 seed,保证可复现
  const seed = nodes.map((n) => n.id).sort().join('|')
  const rand = seededRandom(seed)

  // 初始化:随机位置(围绕中心)
  const cx = CANVAS_WIDTH / 2
  const cy = CANVAS_HEIGHT / 2
  const radius = Math.min(CANVAS_WIDTH, CANVAS_HEIGHT) * 0.35
  for (const node of nodes) {
    const angle = rand() * Math.PI * 2
    const r = radius * (0.5 + rand() * 0.5)
    node.x = cx + r * Math.cos(angle)
    node.y = cy + r * Math.sin(angle)
  }

  // 边的邻接表(双向)
  const adjacency = new Map<string, Set<string>>()
  for (const node of nodes) adjacency.set(node.id, new Set())
  for (const edge of edges) {
    adjacency.get(edge.from)?.add(edge.to)
    adjacency.get(edge.to)?.add(edge.from)
  }

  const nodeMap = new Map(nodes.map((n) => [n.id, n]))

  // 迭代
  for (let iter = 0; iter < ITERATIONS; iter++) {
    const displacements = new Map<string, { dx: number; dy: number }>()
    for (const node of nodes) {
      displacements.set(node.id, { dx: 0, dy: 0 })
    }

    // 温度(随迭代递减,后期位移越小)
    const temperature = MAX_DISPLACEMENT * (1 - iter / ITERATIONS)

    // 斥力:所有节点对
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i]
        const b = nodes[j]
        let dx = a.x - b.x
        let dy = a.y - b.y
        let dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < 1) dist = 1 // 防止除零
        const force = REPULSION / (dist * dist)
        const fx = (dx / dist) * force
        const fy = (dy / dist) * force
        displacements.get(a.id)!.dx += fx
        displacements.get(a.id)!.dy += fy
        displacements.get(b.id)!.dx -= fx
        displacements.get(b.id)!.dy -= fy
      }
    }

    // 引力:有边相连的节点对
    for (const edge of edges) {
      const a = nodeMap.get(edge.from)
      const b = nodeMap.get(edge.to)
      if (!a || !b) continue
      let dx = a.x - b.x
      let dy = a.y - b.y
      let dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < 1) dist = 1
      const force = ATTRACTION * dist
      const fx = (dx / dist) * force
      const fy = (dy / dist) * force
      displacements.get(a.id)!.dx -= fx
      displacements.get(a.id)!.dy -= fy
      displacements.get(b.id)!.dx += fx
      displacements.get(b.id)!.dy += fy
    }

    // 中心引力
    for (const node of nodes) {
      const dx = cx - node.x
      const dy = cy - node.y
      displacements.get(node.id)!.dx += dx * CENTER_GRAVITY
      displacements.get(node.id)!.dy += dy * CENTER_GRAVITY
    }

    // 应用位移(限制最大位移)
    for (const node of nodes) {
      const d = displacements.get(node.id)!
      const dist = Math.sqrt(d.dx * d.dx + d.dy * d.dy)
      if (dist > 0) {
        const limited = Math.min(dist, temperature)
        node.x += (d.dx / dist) * limited
        node.y += (d.dy / dist) * limited
      }
      // 边界约束
      node.x = Math.max(40, Math.min(CANVAS_WIDTH - 40, node.x))
      node.y = Math.max(40, Math.min(CANVAS_HEIGHT - 40, node.y))
    }
  }
}

// ============ 地图生成 ============

function buildMap(subjectId: string): KnowledgeMap | null {
  const subject = subjects.get(subjectId)
  if (!subject) return null

  // 获取该学科的所有知识点
  const allKnowledge = knowledge.list({ subjectId })
  if (allKnowledge.length === 0) {
    return {
      subjectId,
      subjectName: subject.name,
      nodes: [],
      edges: [],
      generatedAt: new Date().toISOString(),
    }
  }

  // 收集所有关联(只保留该学科内的关联)
  const nodeIds = new Set(allKnowledge.map((k) => k.id))
  const edges: MapEdge[] = []
  for (const kp of allKnowledge) {
    for (const rel of kp.relationsFrom) {
      // 只保留目标也在该学科内的关联
      if (nodeIds.has(rel.toId)) {
        edges.push({
          from: rel.fromId,
          to: rel.toId,
          type: rel.type,
          description: rel.description,
          aiGenerated: rel.aiGenerated,
        })
      }
    }
  }

  // 计算每个节点的关联数(用于决定节点大小)
  const relationCount = new Map<string, number>()
  for (const kp of allKnowledge) {
    relationCount.set(kp.id, 0)
  }
  for (const edge of edges) {
    relationCount.set(edge.from, (relationCount.get(edge.from) || 0) + 1)
    relationCount.set(edge.to, (relationCount.get(edge.to) || 0) + 1)
  }

  // 构建节点
  const nodes: MapNode[] = allKnowledge.map((kp) => {
    const count = relationCount.get(kp.id) || 0
    // 关联越多节点越大
    const radius = MIN_RADIUS + Math.min(count, 5) * ((MAX_RADIUS - MIN_RADIUS) / 5)
    return {
      id: kp.id,
      title: kp.title,
      mastery: kp.mastery,
      x: 0, // 布局后填充
      y: 0,
      radius,
      relationCount: count,
    }
  })

  // 运行力导向布局
  runForceLayout(nodes, edges)

  return {
    subjectId,
    subjectName: subject.name,
    nodes,
    edges,
    generatedAt: new Date().toISOString(),
  }
}

// ============ 对外接口 ============

export const knowledgeMap = {
  /**
   * 获取地图(有缓存则返回缓存,无则生成)
   */
  get(subjectId: string): KnowledgeMap | null {
    ensureMapsDir()
    const file = getMapFilePath(subjectId)
    if (fs.existsSync(file)) {
      try {
        return JSON.parse(fs.readFileSync(file, 'utf-8'))
      } catch {}
    }
    // 无缓存,生成
    return knowledgeMap.generate(subjectId)
  },

  /**
   * 强制重新生成地图
   */
  generate(subjectId: string): KnowledgeMap | null {
    ensureMapsDir()
    const map = buildMap(subjectId)
    if (map) {
      fs.writeFileSync(getMapFilePath(subjectId), JSON.stringify(map, null, 2), 'utf-8')
    }
    return map
  },

  /**
   * 删除缓存(数据变化时调用)
   */
  invalidate(subjectId?: string): void {
    ensureMapsDir()
    if (subjectId) {
      const file = getMapFilePath(subjectId)
      if (fs.existsSync(file)) fs.unlinkSync(file)
    } else {
      // 删除所有缓存
      if (fs.existsSync(MAPS_DIR)) {
        for (const f of fs.readdirSync(MAPS_DIR)) {
          if (f.endsWith('.json')) fs.unlinkSync(path.join(MAPS_DIR, f))
        }
      }
    }
  },
}
