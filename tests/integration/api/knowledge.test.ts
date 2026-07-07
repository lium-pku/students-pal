import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { mockDb } from '../__mocks__/db'

// Mock AI functions
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
    it('应返回知识点列表(含关联)', async () => {
      const mockData = [
        {
          id: 'k1',
          title: '勾股定理',
          content: '...',
          tags: '几何',
          subjectId: null,
          mastery: 50,
          relationsFrom: [],
          relationsTo: [],
        },
      ]
      mockDb.knowledgePoint.findMany.mockResolvedValue(mockData)

      const res = await GET(new NextRequest('http://localhost/api/knowledge'))
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data).toHaveLength(1)
      expect(data[0].title).toBe('勾股定理')
      expect(mockDb.knowledgePoint.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { updatedAt: 'desc' },
          include: {
            subject: true,
            relationsFrom: { include: { to: true } },
            relationsTo: { include: { from: true } },
          },
        }),
      )
    })

    it('应支持按 subjectId 过滤', async () => {
      mockDb.knowledgePoint.findMany.mockResolvedValue([])

      await GET(new NextRequest('http://localhost/api/knowledge?subjectId=s1'))

      expect(mockDb.knowledgePoint.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { subjectId: 's1' },
        }),
      )
    })

    it('应支持关键词搜索', async () => {
      mockDb.knowledgePoint.findMany.mockResolvedValue([])

      await GET(new NextRequest('http://localhost/api/knowledge?q=勾股'))

      const callArg = mockDb.knowledgePoint.findMany.mock.calls[0][0]
      expect(callArg.where.OR).toHaveLength(3)
      expect(callArg.where.OR[0].title.contains).toBe('勾股')
    })
  })

  describe('POST /api/knowledge', () => {
    it('应在 title 存在时创建知识点', async () => {
      mockDb.knowledgePoint.create.mockResolvedValue({
        id: 'k1',
        title: 'T',
        content: 'C',
        tags: 'a,b',
        subjectId: null,
        mastery: 0,
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
      expect(mockDb.knowledgePoint.create).toHaveBeenCalledWith({
        data: {
          title: 'T',
          content: 'C',
          tags: 'a,b',
          subjectId: null,
          mastery: 0,
        },
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

    it('应在 tags 为字符串时直接使用', async () => {
      mockDb.knowledgePoint.create.mockResolvedValue({ id: 'k1' })

      const req = new NextRequest('http://localhost/api/knowledge', {
        method: 'POST',
        body: JSON.stringify({ title: 'T', tags: 'a,b,c' }),
        headers: { 'Content-Type': 'application/json' },
      })
      await POST(req)

      expect(mockDb.knowledgePoint.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ tags: 'a,b,c' }),
      })
    })
  })

  describe('GET /api/knowledge/:id', () => {
    it('应返回知识点详情', async () => {
      const mockKp = { id: 'k1', title: 'T', content: 'C', relationsFrom: [], relationsTo: [] }
      mockDb.knowledgePoint.findUnique.mockResolvedValue(mockKp)

      const res = await GET_ONE(
        new NextRequest('http://localhost/api/knowledge/k1'),
        { params: Promise.resolve({ id: 'k1' }) },
      )
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.title).toBe('T')
    })

    it('应在知识点不存在时返回 404', async () => {
      mockDb.knowledgePoint.findUnique.mockResolvedValue(null)

      const res = await GET_ONE(
        new NextRequest('http://localhost/api/knowledge/x'),
        { params: Promise.resolve({ id: 'x' }) },
      )

      expect(res.status).toBe(404)
    })
  })

  describe('PUT /api/knowledge/:id', () => {
    it('应更新指定字段', async () => {
      mockDb.knowledgePoint.update.mockResolvedValue({ id: 'k1', title: '新标题' })

      const req = new NextRequest('http://localhost/api/knowledge/k1', {
        method: 'PUT',
        body: JSON.stringify({ title: '新标题', mastery: 80 }),
        headers: { 'Content-Type': 'application/json' },
      })
      const res = await PUT(req, { params: Promise.resolve({ id: 'k1' }) })

      expect(res.status).toBe(200)
      expect(mockDb.knowledgePoint.update).toHaveBeenCalledWith({
        where: { id: 'k1' },
        data: { title: '新标题', mastery: 80 },
      })
    })

    it('应将 tags 数组转为逗号分隔字符串', async () => {
      mockDb.knowledgePoint.update.mockResolvedValue({})

      const req = new NextRequest('http://localhost/api/knowledge/k1', {
        method: 'PUT',
        body: JSON.stringify({ tags: ['x', 'y'] }),
        headers: { 'Content-Type': 'application/json' },
      })
      await PUT(req, { params: Promise.resolve({ id: 'k1' }) })

      expect(mockDb.knowledgePoint.update).toHaveBeenCalledWith({
        where: { id: 'k1' },
        data: { tags: 'x,y' },
      })
    })
  })

  describe('DELETE /api/knowledge/:id', () => {
    it('应删除知识点', async () => {
      mockDb.knowledgePoint.delete.mockResolvedValue({})

      const res = await DELETE(
        new NextRequest('http://localhost/api/knowledge/k1', { method: 'DELETE' }),
        { params: Promise.resolve({ id: 'k1' }) },
      )

      expect(res.status).toBe(200)
      expect(mockDb.knowledgePoint.delete).toHaveBeenCalledWith({ where: { id: 'k1' } })
    })
  })

  describe('POST /api/knowledge/:id/connect (AI 推荐)', () => {
    it('应在知识点不存在时返回 404', async () => {
      mockDb.knowledgePoint.findUnique.mockResolvedValue(null)

      const res = await CONNECT_POST(
        new NextRequest('http://localhost/api/knowledge/x/connect', { method: 'POST' }),
        { params: Promise.resolve({ id: 'x' }) },
      )

      expect(res.status).toBe(404)
    })

    it('应调用 AI 推荐并去重已存在的关联', async () => {
      mockDb.knowledgePoint.findUnique.mockResolvedValue({
        id: 'k1',
        title: '勾股定理',
        content: '...',
        tags: '几何',
      })
      mockDb.knowledgePoint.findMany.mockResolvedValue([
        { id: 'k2', title: '数轴', content: '...', tags: '' },
        { id: 'k3', title: '乘法', content: '...', tags: '' },
      ])
      mockSuggestKnowledgeRelations.mockResolvedValue([
        { id: 'k2', type: 'related', description: 'd', score: 0.8 },
        { id: 'k3', type: 'extension', description: 'e', score: 0.6 },
      ])
      // k2 已存在关联
      mockDb.knowledgeRelation.findMany.mockResolvedValue([
        { fromId: 'k1', toId: 'k2' },
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

    it('应在 AI 返回空建议时返回空数组', async () => {
      mockDb.knowledgePoint.findUnique.mockResolvedValue({
        id: 'k1', title: 'T', content: '', tags: '',
      })
      mockDb.knowledgePoint.findMany.mockResolvedValue([])
      mockSuggestKnowledgeRelations.mockResolvedValue([])
      mockDb.knowledgeRelation.findMany.mockResolvedValue([])

      const res = await CONNECT_POST(
        new NextRequest('http://localhost/api/knowledge/k1/connect', { method: 'POST' }),
        { params: Promise.resolve({ id: 'k1' }) },
      )
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data).toEqual([])
    })
  })

  describe('PUT /api/knowledge/:id/connect (手动建立)', () => {
    it('应在 fromId 和 toId 存在时建立关联', async () => {
      mockDb.knowledgeRelation.create.mockResolvedValue({
        id: 'r1', fromId: 'k1', toId: 'k2', type: 'related', description: '', aiGenerated: false,
      })

      const req = new NextRequest('http://localhost/api/knowledge/k1/connect', {
        method: 'PUT',
        body: JSON.stringify({ fromId: 'k1', toId: 'k2', type: 'related' }),
        headers: { 'Content-Type': 'application/json' },
      })
      const res = await CONNECT_PUT(req)

      expect(res.status).toBe(201)
      expect(mockDb.knowledgeRelation.create).toHaveBeenCalledWith({
        data: {
          fromId: 'k1', toId: 'k2', type: 'related', description: '', aiGenerated: false,
        },
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
    it('应删除指定关联', async () => {
      mockDb.knowledgeRelation.delete.mockResolvedValue({})

      const res = await DELETE_REL(
        new NextRequest('http://localhost/api/knowledge/relations/r1', { method: 'DELETE' }),
        { params: Promise.resolve({ relId: 'r1' }) },
      )

      expect(res.status).toBe(200)
      expect(mockDb.knowledgeRelation.delete).toHaveBeenCalledWith({ where: { id: 'r1' } })
    })
  })
})
