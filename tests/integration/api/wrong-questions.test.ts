import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { mockDb } from '../__mocks__/db'

const mockExplainWrongQuestion = vi.fn()
vi.mock('@/lib/ai', () => ({
  explainWrongQuestion: (...args: any[]) => mockExplainWrongQuestion(...args),
}))

import { GET, POST } from '@/app/api/wrong-questions/route'
import { GET as GET_ONE, PUT, DELETE } from '@/app/api/wrong-questions/[id]/route'
import { POST as EXPLAIN } from '@/app/api/wrong-questions/[id]/explain/route'

describe('API /api/wrong-questions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/wrong-questions', () => {
    it('应返回错题列表', async () => {
      mockDb.wrongQuestion.findMany.mockResolvedValue([
        { id: 'w1', question: 'Q1', subject: null, relatedKnowledge: null },
      ])

      const res = await GET(new NextRequest('http://localhost/api/wrong-questions'))
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data).toHaveLength(1)
      expect(mockDb.wrongQuestion.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { updatedAt: 'desc' },
          include: { subject: true, relatedKnowledge: true },
        }),
      )
    })

    it('应支持按学科和状态过滤', async () => {
      mockDb.wrongQuestion.findMany.mockResolvedValue([])

      await GET(new NextRequest('http://localhost/api/wrong-questions?subjectId=s1&status=unresolved'))

      const callArg = mockDb.wrongQuestion.findMany.mock.calls[0][0]
      expect(callArg.where.subjectId).toBe('s1')
      expect(callArg.where.status).toBe('unresolved')
    })

    it('应支持关键词搜索', async () => {
      mockDb.wrongQuestion.findMany.mockResolvedValue([])

      await GET(new NextRequest('http://localhost/api/wrong-questions?q=负数'))

      const callArg = mockDb.wrongQuestion.findMany.mock.calls[0][0]
      expect(callArg.where.OR).toHaveLength(2)
    })
  })

  describe('POST /api/wrong-questions', () => {
    it('应在 question 存在时创建错题', async () => {
      mockDb.wrongQuestion.create.mockResolvedValue({ id: 'w1', question: 'Q1' })

      const req = new NextRequest('http://localhost/api/wrong-questions', {
        method: 'POST',
        body: JSON.stringify({
          question: 'Q1',
          questionType: 'multiple',
          options: ['A', 'B', 'C'],
          myAnswer: 'A',
          correctAnswer: 'B',
        }),
        headers: { 'Content-Type': 'application/json' },
      })
      const res = await POST(req)

      expect(res.status).toBe(201)
      expect(mockDb.wrongQuestion.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          question: 'Q1',
          questionType: 'multiple',
          // options 数组应被序列化为 JSON 字符串
          options: JSON.stringify(['A', 'B', 'C']),
          myAnswer: 'A',
          correctAnswer: 'B',
          status: 'unresolved',
        }),
      })
    })

    it('应在 question 缺失时返回 400', async () => {
      const req = new NextRequest('http://localhost/api/wrong-questions', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: { 'Content-Type': 'application/json' },
      })
      const res = await POST(req)

      expect(res.status).toBe(400)
    })

    it('应在未提供 questionType 时默认 short', async () => {
      mockDb.wrongQuestion.create.mockResolvedValue({})

      const req = new NextRequest('http://localhost/api/wrong-questions', {
        method: 'POST',
        body: JSON.stringify({ question: 'Q' }),
        headers: { 'Content-Type': 'application/json' },
      })
      await POST(req)

      expect(mockDb.wrongQuestion.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ questionType: 'short' }),
      })
    })
  })

  describe('GET /api/wrong-questions/:id', () => {
    it('应返回错题详情', async () => {
      mockDb.wrongQuestion.findUnique.mockResolvedValue({ id: 'w1', question: 'Q' })

      const res = await GET_ONE(
        new NextRequest('http://localhost/api/wrong-questions/w1'),
        { params: Promise.resolve({ id: 'w1' }) },
      )

      expect(res.status).toBe(200)
    })

    it('应在错题不存在时返回 404', async () => {
      mockDb.wrongQuestion.findUnique.mockResolvedValue(null)

      const res = await GET_ONE(
        new NextRequest('http://localhost/api/wrong-questions/x'),
        { params: Promise.resolve({ id: 'x' }) },
      )

      expect(res.status).toBe(404)
    })
  })

  describe('PUT /api/wrong-questions/:id', () => {
    it('应更新指定字段', async () => {
      mockDb.wrongQuestion.update.mockResolvedValue({})

      const req = new NextRequest('http://localhost/api/wrong-questions/w1', {
        method: 'PUT',
        body: JSON.stringify({ status: 'mastered', analysis: '我懂了' }),
        headers: { 'Content-Type': 'application/json' },
      })
      const res = await PUT(req, { params: Promise.resolve({ id: 'w1' }) })

      expect(res.status).toBe(200)
      expect(mockDb.wrongQuestion.update).toHaveBeenCalledWith({
        where: { id: 'w1' },
        data: { status: 'mastered', analysis: '我懂了' },
      })
    })

    it('应将 options 数组序列化为字符串', async () => {
      mockDb.wrongQuestion.update.mockResolvedValue({})

      const req = new NextRequest('http://localhost/api/wrong-questions/w1', {
        method: 'PUT',
        body: JSON.stringify({ options: ['X', 'Y'] }),
        headers: { 'Content-Type': 'application/json' },
      })
      await PUT(req, { params: Promise.resolve({ id: 'w1' }) })

      expect(mockDb.wrongQuestion.update).toHaveBeenCalledWith({
        where: { id: 'w1' },
        data: { options: JSON.stringify(['X', 'Y']) },
      })
    })
  })

  describe('DELETE /api/wrong-questions/:id', () => {
    it('应删除错题', async () => {
      mockDb.wrongQuestion.delete.mockResolvedValue({})

      const res = await DELETE(
        new NextRequest('http://localhost/api/wrong-questions/w1', { method: 'DELETE' }),
        { params: Promise.resolve({ id: 'w1' }) },
      )

      expect(res.status).toBe(200)
    })
  })

  describe('POST /api/wrong-questions/:id/explain (AI 解析)', () => {
    it('应在错题不存在时返回 404', async () => {
      mockDb.wrongQuestion.findUnique.mockResolvedValue(null)

      const res = await EXPLAIN(
        new NextRequest('http://localhost/api/wrong-questions/x/explain', { method: 'POST' }),
        { params: Promise.resolve({ id: 'x' }) },
      )

      expect(res.status).toBe(404)
    })

    it('应触发 AI 解析并保存 Markdown 结果', async () => {
      mockDb.wrongQuestion.findUnique.mockResolvedValue({
        id: 'w1',
        question: 'Q',
        questionType: 'short',
        options: '',
        myAnswer: 'A',
        correctAnswer: 'B',
        analysis: '',
        relatedKnowledge: null,
      })
      mockExplainWrongQuestion.mockResolvedValue({
        concept: '概念',
        whyWrong: '错因',
        howToFix: '思路',
        similarTip: '提醒',
      })
      mockDb.wrongQuestion.update.mockResolvedValue({})

      const res = await EXPLAIN(
        new NextRequest('http://localhost/api/wrong-questions/w1/explain', { method: 'POST' }),
        { params: Promise.resolve({ id: 'w1' }) },
      )
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.explanation).toContain('概念')
      expect(data.explanation).toContain('错因')
      expect(data.explanation).toContain('思路')
      expect(data.explanation).toContain('提醒')
      expect(data.structured.concept).toBe('概念')
      // 状态应自动改为 reviewed
      expect(mockDb.wrongQuestion.update).toHaveBeenCalledWith({
        where: { id: 'w1' },
        data: expect.objectContaining({ status: 'reviewed' }),
      })
    })

    it('应在 AI 失败时返回 500', async () => {
      mockDb.wrongQuestion.findUnique.mockResolvedValue({
        id: 'w1', question: 'Q', questionType: 'short', options: '',
        myAnswer: '', correctAnswer: '', analysis: '', relatedKnowledge: null,
      })
      mockExplainWrongQuestion.mockRejectedValue(new Error('AI 不可用'))

      const res = await EXPLAIN(
        new NextRequest('http://localhost/api/wrong-questions/w1/explain', { method: 'POST' }),
        { params: Promise.resolve({ id: 'w1' }) },
      )

      expect(res.status).toBe(500)
    })

    it('应将关联知识点作为 context 传给 AI', async () => {
      mockDb.wrongQuestion.findUnique.mockResolvedValue({
        id: 'w1', question: 'Q', questionType: 'short', options: '',
        myAnswer: '', correctAnswer: '', analysis: '',
        relatedKnowledge: { id: 'k1', title: '勾股定理', content: '直角三角形...' },
      })
      mockExplainWrongQuestion.mockResolvedValue({
        concept: '', whyWrong: '', howToFix: '', similarTip: '',
      })
      mockDb.wrongQuestion.update.mockResolvedValue({})

      await EXPLAIN(
        new NextRequest('http://localhost/api/wrong-questions/w1/explain', { method: 'POST' }),
        { params: Promise.resolve({ id: 'w1' }) },
      )

      expect(mockExplainWrongQuestion).toHaveBeenCalledWith(
        expect.objectContaining({
          knowledgeContext: expect.stringContaining('勾股定理'),
        }),
      )
    })
  })
})
