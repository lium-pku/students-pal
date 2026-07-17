import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import fs from 'fs'
import path from 'path'

vi.mock('@/lib/vault', () => ({
  subjects: { get: vi.fn() },
  knowledge: { list: vi.fn() },
}))

import { subjects, knowledge } from '@/lib/vault'
import { knowledgeMap } from '@/lib/knowledge-map'

const MAPS_DIR = path.join(process.cwd(), 'vault', '.maps')
function cleanMaps() { if (fs.existsSync(MAPS_DIR)) for (const f of fs.readdirSync(MAPS_DIR)) if (f.endsWith('.json')) fs.unlinkSync(path.join(MAPS_DIR, f)) }

describe('lib/knowledge-map.ts', () => {
  beforeEach(() => { cleanMaps(); vi.clearAllMocks() })
  afterEach(() => { cleanMaps() })

  it('应在学科不存在时返回 null', () => {
    vi.mocked(subjects.get).mockReturnValue(null)
    expect(knowledgeMap.generate('nonexistent')).toBeNull()
  })

  it('应生成空地图(无知识点)', () => {
    vi.mocked(subjects.get).mockReturnValue({ id: 's1', name: '数学', color: '', icon: null, createdAt: '', updatedAt: '' })
    vi.mocked(knowledge.list).mockReturnValue([])
    const map = knowledgeMap.generate('s1')
    expect(map!.nodes).toHaveLength(0)
    expect(map!.subjectName).toBe('数学')
  })

  it('应生成包含节点和边的地图', () => {
    vi.mocked(subjects.get).mockReturnValue({ id: 's1', name: '数学', color: '', icon: null, createdAt: '', updatedAt: '' })
    vi.mocked(knowledge.list).mockReturnValue([
      { id: 'k1', title: 'A', content: '', tags: [], subjectId: 's1', mastery: 75, relationsFrom: [{ fromId: 'k1', toId: 'k2', type: 'related', description: '', aiGenerated: false, id: 'r1', createdAt: '' }], relationsTo: [], createdAt: '', updatedAt: '' },
      { id: 'k2', title: 'B', content: '', tags: [], subjectId: 's1', mastery: 60, relationsFrom: [], relationsTo: [], createdAt: '', updatedAt: '' },
    ])
    const map = knowledgeMap.generate('s1')
    expect(map!.nodes).toHaveLength(2)
    expect(map!.edges).toHaveLength(1)
  })

  it('应计算节点位置(x,y 不为 0)', () => {
    vi.mocked(subjects.get).mockReturnValue({ id: 's1', name: '数学', color: '', icon: null, createdAt: '', updatedAt: '' })
    vi.mocked(knowledge.list).mockReturnValue([
      { id: 'k1', title: 'A', content: '', tags: [], subjectId: 's1', mastery: 50, relationsFrom: [], relationsTo: [], createdAt: '', updatedAt: '' },
      { id: 'k2', title: 'B', content: '', tags: [], subjectId: 's1', mastery: 50, relationsFrom: [], relationsTo: [], createdAt: '', updatedAt: '' },
    ])
    const map = knowledgeMap.generate('s1')
    expect(map!.nodes[0].x).not.toBe(0)
    expect(map!.nodes[1].x).not.toBe(0)
  })

  it('应根据关联数计算节点大小', () => {
    vi.mocked(subjects.get).mockReturnValue({ id: 's1', name: '数学', color: '', icon: null, createdAt: '', updatedAt: '' })
    vi.mocked(knowledge.list).mockReturnValue([
      { id: 'k1', title: '中心', content: '', tags: [], subjectId: 's1', mastery: 50, relationsFrom: [{ fromId: 'k1', toId: 'k2', type: 'related', description: '', aiGenerated: false, id: 'r1', createdAt: '' }, { fromId: 'k1', toId: 'k3', type: 'related', description: '', aiGenerated: false, id: 'r2', createdAt: '' }], relationsTo: [], createdAt: '', updatedAt: '' },
      { id: 'k2', title: 'B', content: '', tags: [], subjectId: 's1', mastery: 50, relationsFrom: [], relationsTo: [], createdAt: '', updatedAt: '' },
      { id: 'k3', title: 'C', content: '', tags: [], subjectId: 's1', mastery: 50, relationsFrom: [], relationsTo: [], createdAt: '', updatedAt: '' },
    ])
    const map = knowledgeMap.generate('s1')
    expect(map!.nodes.find(n => n.id === 'k1')!.radius).toBeGreaterThan(map!.nodes.find(n => n.id === 'k2')!.radius)
  })

  it('应将地图缓存到文件', () => {
    vi.mocked(subjects.get).mockReturnValue({ id: 's1', name: '数学', color: '', icon: null, createdAt: '', updatedAt: '' })
    vi.mocked(knowledge.list).mockReturnValue([])
    knowledgeMap.generate('s1')
    expect(fs.existsSync(path.join(MAPS_DIR, 's1.json'))).toBe(true)
  })

  it('同一份数据应生成相同布局(可复现)', () => {
    vi.mocked(subjects.get).mockReturnValue({ id: 's1', name: '数学', color: '', icon: null, createdAt: '', updatedAt: '' })
    vi.mocked(knowledge.list).mockReturnValue([
      { id: 'k1', title: 'A', content: '', tags: [], subjectId: 's1', mastery: 50, relationsFrom: [], relationsTo: [], createdAt: '', updatedAt: '' },
      { id: 'k2', title: 'B', content: '', tags: [], subjectId: 's1', mastery: 50, relationsFrom: [], relationsTo: [], createdAt: '', updatedAt: '' },
    ])
    const m1 = knowledgeMap.generate('s1'); cleanMaps(); const m2 = knowledgeMap.generate('s1')
    expect(m1!.nodes[0].x).toBe(m2!.nodes[0].x)
  })

  it('只保留同学科内的关联', () => {
    vi.mocked(subjects.get).mockReturnValue({ id: 's1', name: '数学', color: '', icon: null, createdAt: '', updatedAt: '' })
    vi.mocked(knowledge.list).mockReturnValue([
      { id: 'k1', title: 'A', content: '', tags: [], subjectId: 's1', mastery: 50, relationsFrom: [{ fromId: 'k1', toId: 'k2', type: 'related', description: '', aiGenerated: false, id: 'r1', createdAt: '' }, { fromId: 'k1', toId: 'k_other', type: 'related', description: '', aiGenerated: false, id: 'r2', createdAt: '' }], relationsTo: [], createdAt: '', updatedAt: '' },
      { id: 'k2', title: 'B', content: '', tags: [], subjectId: 's1', mastery: 50, relationsFrom: [], relationsTo: [], createdAt: '', updatedAt: '' },
    ])
    const map = knowledgeMap.generate('s1')
    expect(map!.edges).toHaveLength(1)
    expect(map!.edges[0].to).toBe('k2')
  })

  it('有缓存时 get 应返回缓存', () => {
    vi.mocked(subjects.get).mockReturnValue({ id: 's1', name: '数学', color: '', icon: null, createdAt: '', updatedAt: '' })
    vi.mocked(knowledge.list).mockReturnValue([])
    const generated = knowledgeMap.generate('s1')
    const cached = knowledgeMap.get('s1')
    expect(cached).toEqual(generated)
  })

  it('无缓存时 get 应自动生成', () => {
    vi.mocked(subjects.get).mockReturnValue({ id: 's1', name: '数学', color: '', icon: null, createdAt: '', updatedAt: '' })
    vi.mocked(knowledge.list).mockReturnValue([])
    const map = knowledgeMap.get('s1')
    expect(map).not.toBeNull()
    expect(fs.existsSync(path.join(MAPS_DIR, 's1.json'))).toBe(true)
  })

  it('invalidate 应删除指定学科缓存', () => {
    vi.mocked(subjects.get).mockReturnValue({ id: 's1', name: '数学', color: '', icon: null, createdAt: '', updatedAt: '' })
    vi.mocked(knowledge.list).mockReturnValue([])
    knowledgeMap.generate('s1')
    knowledgeMap.invalidate('s1')
    expect(fs.existsSync(path.join(MAPS_DIR, 's1.json'))).toBe(false)
  })

  it('invalidate 无参数时删除所有缓存', () => {
    vi.mocked(subjects.get).mockReturnValue({ id: 's1', name: '数学', color: '', icon: null, createdAt: '', updatedAt: '' })
    vi.mocked(knowledge.list).mockReturnValue([])
    knowledgeMap.generate('s1')
    knowledgeMap.invalidate()
    expect(fs.existsSync(path.join(MAPS_DIR, 's1.json'))).toBe(false)
  })
})
