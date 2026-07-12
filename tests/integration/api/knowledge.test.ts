import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { mockVault } from '../__mocks__/vault'

const mockSuggestKnowledgeRelations = vi.fn()
vi.mock('@/lib/ai', () => ({
  suggestKnowledgeRelations: (...args: any[]) => mockSuggestKnowledgeRelations(...args),
}))

import { GET, POST } from '@/app/api/knowledge/route'
import { GET as GET_ONE, PUT, DELETE } from '@/app/api/knowledge/[id]/route'
import { POST as CONNECT_POST, PUT as CONNECT_PUT } from '@/app/api/knowledge/[id]/connect/route'
import { DELETE as DELETE_REL } from '@/app/api/knowledge/relations/[relId]/route'

describe('API /api/knowledge', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/knowledge', () => {
    it('应返回知识点列表', async () => {
      const mockData = [
        {
          id: 'k1',
          title: '勾股定理',
          content: '...',
          tags: ['几何'],
          subjectId: null,
          mastery: 50,
          relationsFrom: [],
          relationsTo: [],
        },
      ]
      mockVault.knowledge.list.mockReturnValue(mockData)

      const res = await GET(new NextRequest('http://localhost/api/knowledge'))
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data).toHaveLength(1)
      expect(data[0].title).toBe('勾股定理')
    })

    it('应支持按 subjectId 过滤', async () => {
      mockVault.knowledge.list.mockReturnValue([])

      await GET(new NextRequest('http://localhost/api/knowledge?subjectId=s1'))

      expect(mockVault.knowledge.list).toHaveBeenCalledWith({ subjectId: 's1', q: undefined })
    })

    it('应支持关键词搜索', async () => {
      mockVault.knowledge.list.mockReturnValue([])

      await GET(new NextRequest('http://localhost/api/knowledge?q=勾股'))

      expect(mockVault.knowledge.list).toHaveBeenCalledWith({ subjectId: undefined, q: '勾股' })
    })
  })

  describe('POST /api/knowledge', () => {
    it('应在 title 存在时创建知识点', async () => {
      mockVault.knowledge.create.mockReturnValue({
        id: 'k1', title: 'T', content: 'C', tags: ['a', 'b'],
        subjectId: null, mastery: 0,
      })

      const req = new NextRequest('http://localhost/api/knowledge', {
        method: 'POST',
        body: JSON.stringify({ title: 'T', content: 'C', tags: ['a', 'b'] }),
        headers: { 'Content-Type': 'application/json' },
      })
      const res = await POST(req)
      const data = await res.json()

      expect(res.status).toBe(201)
      expect(data.id).toBe('k1')
      expect(mockVault.knowledge.create).toHaveBeenCalledWith({
        title: 'T',
        content: 'C',
        tags: ['a', 'b'],
        subjectId: null,
        mastery: 0,
      })
    })

    it('应在 title 缺失时返回 400', async () => {
      const req = new NextRequest('http://localhost/api/knowledge', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: { 'Content-Type': 'application/json' },
      })
      const res = await POST(req)

      expect(res.status).toBe(400)
    })
  })

  describe('GET /api/knowledge/:id', () => {
    it('应返回知识点详情', async () => {
      const mockKp = { id: 'k1', title: 'T', content: 'C', relationsFrom: [], relationsTo: [] }
      mockVault.knowledge.get.mockReturnValue(mockKp)

      const res = await GET_ONE(
        new NextRequest('http://localhost/api/knowledge/k1'),
        { params: Promise.resolve({ id: 'k1' }) },
      )
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.title).toBe('T')
    })

    it('应在知识点不存在时返回 404', async () => {
      mockVault.knowledge.get.mockReturnValue(null)

      const res = await GET_ONE(
        new NextRequest('http://localhost/api/knowledge/x'),
        { params: Promise.resolve({ id: 'x' }) },
      )

      expect(res.status).toBe(404)
    })
  })

  describe('PUT /api/knowledge/:id', () => {
    it('应更新指定字段', async () => {
      mockVault.knowledge.update.mockReturnValue({ id: 'k1', title: '新标题' })

      const req = new NextRequest('http://localhost/api/knowledge/k1', {
        method: 'PUT',
        body: JSON.stringify({ title: '新标题', mastery: 80 }),
        headers: { 'Content-Type': 'application/json' },
      })
      const res = await PUT(req, { params: Promise.resolve({ id: 'k1' }) })

      expect(res.status).toBe(200)
      expect(mockVault.knowledge.update).toHaveBeenCalledWith('k1', {
        title: '新标题',
        mastery: 80,
      })
    })
  })

  describe('DELETE /api/knowledge/:id', () => {
    it('应删除知识点', async () => {
      mockVault.knowledge.delete.mockReturnValue(undefined)

      const res = await DELETE(
        new NextRequest('http://localhost/api/knowledge/k1', { method: 'DELETE' }),
        { params: Promise.resolve({ id: 'k1' }) },
      )

      expect(res.status).toBe(200)
      expect(mockVault.knowledge.delete).toHaveBeenCalledWith('k1')
    })
  })

  describe('POST /api/knowledge/:id/connect (AI 推荐)', () => {
    it('应在知识点不存在时返回 404', async () => {
      mockVault.knowledge.get.mockReturnValue(null)

      const res = await CONNECT_POST(
        new NextRequest('http://localhost/api/knowledge/x/connect', { method: 'POST' }),
        { params: Promise.resolve({ id: 'x' }) },
      )

      expect(res.status).toBe(404)
    })

    it('应调用 AI 推荐并去重已存在的关联', async () => {
      mockVault.knowledge.get.mockReturnValue({
        id: 'k1', title: '勾股定理', content: '...', tags: ['几何'],
        relationsFrom: [{ toId: 'k2' }],
        relationsTo: [],
      })
      mockVault.knowledge.list.mockReturnValue([
        { id: 'k2', title: '数轴', content: '...', tags: [] },
        { id: 'k3', title: '乘法', content: '...', tags: [] },
      ])
      mockSuggestKnowledgeRelations.mockResolvedValue([
        { id: 'k2', type: 'related', description: 'd', score: 0.8 },
        { id: 'k3', type: 'extension', description: 'e', score: 0.6 },
      ])

      const res = await CONNECT_POST(
        new NextRequest('http://localhost/api/knowledge/k1/connect', { method: 'POST' }),
        { params: Promise.resolve({ id: 'k1' }) },
      )
      const data = await res.json()

      expect(res.status).toBe(200)
      // k2 被去重,只剩 k3
      expect(data).toHaveLength(1)
      expect(data[0].id).toBe('k3')
    })
  })

  describe('PUT /api/knowledge/:id/connect (手动建立)', () => {
    it('应在 fromId 和 toId 存在时建立关联', async () => {
      mockVault.knowledge.addRelation.mockReturnValue({
        id: 'r1', fromId: 'k1', toId: 'k2', type: 'related', description: '', aiGenerated: false,
      })

      const req = new NextRequest('http://localhost/api/knowledge/k1/connect', {
        method: 'PUT',
        body: JSON.stringify({ fromId: 'k1', toId: 'k2', type: 'related' }),
        headers: { 'Content-Type': 'application/json' },
      })
      const res = await CONNECT_PUT(req)

      expect(res.status).toBe(201)
      expect(mockVault.knowledge.addRelation).toHaveBeenCalledWith({
        fromId: 'k1', toId: 'k2', type: 'related', description: '', aiGenerated: false,
      })
    })

    it('应在缺少 fromId 或 toId 时返回 400', async () => {
      const req = new NextRequest('http://localhost/api/knowledge/k1/connect', {
        method: 'PUT',
        body: JSON.stringify({ fromId: 'k1' }),
        headers: { 'Content-Type': 'application/json' },
      })
      const res = await CONNECT_PUT(req)

      expect(res.status).toBe(400)
    })
  })

  describe('DELETE /api/knowledge/relations/:relId', () => {
    it('应删除指定关联(需 fromId+toId query 参数)', async () => {
      mockVault.knowledge.removeRelationByEndpoints.mockReturnValue(undefined)

      const res = await DELETE_REL(
        new NextRequest('http://localhost/api/knowledge/relations/r1?fromId=k1&toId=k2', { method: 'DELETE' }),
        { params: Promise.resolve({ relId: 'r1' }) },
      )

      expect(res.status).toBe(200)
      expect(mockVault.knowledge.removeRelationByEndpoints).toHaveBeenCalledWith('k1', 'k2')
    })

    it('应在缺少 query 参数时返回 400', async () => {
      const res = await DELETE_REL(
        new NextRequest('http://localhost/api/knowledge/relations/r1', { method: 'DELETE' }),
        { params: Promise.resolve({ relId: 'r1' }) },
      )

      expect(res.status).toBe(400)
    })
  })
})
