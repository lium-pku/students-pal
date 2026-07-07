import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { mockDb } from '../__mocks__/db'

const mockReflectOnThinking = vi.fn()
vi.mock('@/lib/ai', () => ({
  reflectOnThinking: (...args: any[]) => mockReflectOnThinking(...args),
}))

import { GET, POST } from '@/app/api/thinking/route'
import { GET as GET_ONE, PUT, DELETE } from '@/app/api/thinking/[id]/route'
import { POST as REFLECT } from '@/app/api/thinking/[id]/reflect/route'

describe('API /api/thinking', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/thinking', () => {
    it('应返回笔记列表', async () => {
      mockDb.thinkingNote.findMany.mockResolvedValue([
        { id: 't1', title: 'T1', content: 'C', status: 'draft', subject: null },
      ])

      const res = await GET(new NextRequest('http://localhost/api/thinking'))
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data).toHaveLength(1)
      expect(mockDb.thinkingNote.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { updatedAt: 'desc' },
          include: { subject: true },
        }),
      )
    })

    it('应支持按学科和状态过滤', async () => {
      mockDb.thinkingNote.findMany.mockResolvedValue([])

      await GET(new NextRequest('http://localhost/api/thinking?subjectId=s1&status=reflected'))

      const callArg = mockDb.thinkingNote.findMany.mock.calls[0][0]
      expect(callArg.where.subjectId).toBe('s1')
      expect(callArg.where.status).toBe('reflected')
    })

    it('应支持关键词搜索(标题/内容/问题)', async () => {
      mockDb.thinkingNote.findMany.mockResolvedValue([])

      await GET(new NextRequest('http://localhost/api/thinking?q=负数'))

      const callArg = mockDb.thinkingNote.findMany.mock.calls[0][0]
      expect(callArg.where.OR).toHaveLength(3)
    })
  })

  describe('POST /api/thinking', () => {
    it('应在 title 存在时创建笔记', async () => {
      mockDb.thinkingNote.create.mockResolvedValue({
        id: 't1', title: 'T', content: '', question: '', status: 'draft',
      })

      const req = new NextRequest('http://localhost/api/thinking', {
        method: 'POST',
        body: JSON.stringify({ title: 'T', question: 'Q' }),
        headers: { 'Content-Type': 'application/json' },
      })
      const res = await POST(req)

      expect(res.status).toBe(201)
      expect(mockDb.thinkingNote.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          title: 'T',
          question: 'Q',
          status: 'draft',
        }),
      })
    })

    it('应在 title 缺失时返回 400', async () => {
      const req = new NextRequest('http://localhost/api/thinking', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: { 'Content-Type': 'application/json' },
      })
      const res = await POST(req)

      expect(res.status).toBe(400)
    })
  })

  describe('GET /api/thinking/:id', () => {
    it('应返回笔记详情', async () => {
      mockDb.thinkingNote.findUnique.mockResolvedValue({
        id: 't1', title: 'T', subject: null,
      })

      const res = await GET_ONE(
        new NextRequest('http://localhost/api/thinking/t1'),
        { params: Promise.resolve({ id: 't1' }) },
      )

      expect(res.status).toBe(200)
    })

    it('应在笔记不存在时返回 404', async () => {
      mockDb.thinkingNote.findUnique.mockResolvedValue(null)

      const res = await GET_ONE(
        new NextRequest('http://localhost/api/thinking/x'),
        { params: Promise.resolve({ id: 'x' }) },
      )

      expect(res.status).toBe(404)
    })
  })

  describe('PUT /api/thinking/:id', () => {
    it('应更新指定字段', async () => {
      mockDb.thinkingNote.update.mockResolvedValue({})

      const req = new NextRequest('http://localhost/api/thinking/t1', {
        method: 'PUT',
        body: JSON.stringify({ title: '新', content: '新内容', status: 'reflected' }),
        headers: { 'Content-Type': 'application/json' },
      })
      const res = await PUT(req, { params: Promise.resolve({ id: 't1' }) })

      expect(res.status).toBe(200)
      expect(mockDb.thinkingNote.update).toHaveBeenCalledWith({
        where: { id: 't1' },
        data: { title: '新', content: '新内容', status: 'reflected' },
      })
    })
  })

  describe('DELETE /api/thinking/:id', () => {
    it('应删除笔记', async () => {
      mockDb.thinkingNote.delete.mockResolvedValue({})

      const res = await DELETE(
        new NextRequest('http://localhost/api/thinking/t1', { method: 'DELETE' }),
        { params: Promise.resolve({ id: 't1' }) },
      )

      expect(res.status).toBe(200)
    })
  })

  describe('POST /api/thinking/:id/reflect (AI 引导)', () => {
    it('应在笔记不存在时返回 404', async () => {
      mockDb.thinkingNote.findUnique.mockResolvedValue(null)

      const res = await REFLECT(
        new NextRequest('http://localhost/api/thinking/x/reflect', { method: 'POST' }),
        { params: Promise.resolve({ id: 'x' }) },
      )

      expect(res.status).toBe(404)
    })

    it('应触发 AI 引导并保存结果', async () => {
      mockDb.thinkingNote.findUnique.mockResolvedValue({
        id: 't1',
        title: 'T',
        question: 'Q',
        content: 'C',
        subject: null,
        relatedKnowledgeIds: '',
      })
      mockReflectOnThinking.mockResolvedValue('# AI 引导内容')
      mockDb.thinkingNote.update.mockResolvedValue({})

      const req = new NextRequest('http://localhost/api/thinking/t1/reflect', {
        method: 'POST',
        body: JSON.stringify({ mode: 'socratic' }),
        headers: { 'Content-Type': 'application/json' },
      })
      const res = await REFLECT(req, { params: Promise.resolve({ id: 't1' }) })
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.reflection).toBe('# AI 引导内容')
      expect(mockReflectOnThinking).toHaveBeenCalledWith(
        expect.objectContaining({ mode: 'socratic' }),
      )
      // 第一次更新状态为 reflecting,第二次保存 reflection
      expect(mockDb.thinkingNote.update).toHaveBeenCalledTimes(2)
    })

    it('应在未指定 mode 时默认 socratic', async () => {
      mockDb.thinkingNote.findUnique.mockResolvedValue({
        id: 't1', title: 'T', question: '', content: '', subject: null, relatedKnowledgeIds: '',
      })
      mockReflectOnThinking.mockResolvedValue('R')
      mockDb.thinkingNote.update.mockResolvedValue({})

      const req = new NextRequest('http://localhost/api/thinking/t1/reflect', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: { 'Content-Type': 'application/json' },
      })
      await REFLECT(req, { params: Promise.resolve({ id: 't1' }) })

      expect(mockReflectOnThinking).toHaveBeenCalledWith(
        expect.objectContaining({ mode: 'socratic' }),
      )
    })

    it('应在 AI 失败时回滚状态并返回 500', async () => {
      mockDb.thinkingNote.findUnique.mockResolvedValue({
        id: 't1', title: 'T', question: '', content: '', subject: null, relatedKnowledgeIds: '',
      })
      mockReflectOnThinking.mockRejectedValue(new Error('AI 不可用'))
      mockDb.thinkingNote.update.mockResolvedValue({})

      const req = new NextRequest('http://localhost/api/thinking/t1/reflect', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: { 'Content-Type': 'application/json' },
      })
      const res = await REFLECT(req, { params: Promise.resolve({ id: 't1' }) })

      expect(res.status).toBe(500)
      // 应该有 3 次更新:reflecting → 回滚到 draft
      expect(mockDb.thinkingNote.update.mock.calls.some(
        (c) => c[0].data.status === 'draft'
      )).toBe(true)
    })

    it('应注入相关知识点上下文', async () => {
      mockDb.thinkingNote.findUnique.mockResolvedValue({
        id: 't1', title: 'T', question: '', content: '', subject: null,
        relatedKnowledgeIds: 'k1,k2',
      })
      mockDb.knowledgePoint.findMany.mockResolvedValue([
        { id: 'k1', title: 'KP1', content: '内容1' },
        { id: 'k2', title: 'KP2', content: '内容2' },
      ])
      mockReflectOnThinking.mockResolvedValue('R')
      mockDb.thinkingNote.update.mockResolvedValue({})

      const req = new NextRequest('http://localhost/api/thinking/t1/reflect', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: { 'Content-Type': 'application/json' },
      })
      await REFLECT(req, { params: Promise.resolve({ id: 't1' }) })

      expect(mockReflectOnThinking).toHaveBeenCalledWith(
        expect.objectContaining({
          context: expect.stringContaining('KP1'),
        }),
      )
    })
  })
})
