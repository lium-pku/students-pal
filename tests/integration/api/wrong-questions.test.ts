import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { mockVault } from '../__mocks__/vault'

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
      mockVault.wrongQuestions.list.mockReturnValue([
        { id: 'w1', question: 'Q1', subject: null, relatedKnowledge: null },
      ])

      const res = await GET(new NextRequest('http://localhost/api/wrong-questions'))
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data).toHaveLength(1)
    })

    it('应支持按学科和状态过滤', async () => {
      mockVault.wrongQuestions.list.mockReturnValue([])

      await GET(new NextRequest('http://localhost/api/wrong-questions?subjectId=s1&status=unresolved'))

      expect(mockVault.wrongQuestions.list).toHaveBeenCalledWith({ subjectId: 's1', status: 'unresolved', q: undefined })
    })
  })

  describe('POST /api/wrong-questions', () => {
    it('应在 question 存在时创建错题', async () => {
      mockVault.wrongQuestions.create.mockReturnValue({ id: 'w1', question: 'Q1' })

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
      expect(mockVault.wrongQuestions.create).toHaveBeenCalledWith({
        question: 'Q1',
        questionType: 'multiple',
        options: JSON.stringify(['A', 'B', 'C']),
        myAnswer: 'A',
        correctAnswer: 'B',
        analysis: '',
        subjectId: null,
        relatedKnowledgeId: null,
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
  })

  describe('GET /api/wrong-questions/:id', () => {
    it('应返回错题详情', async () => {
      mockVault.wrongQuestions.get.mockReturnValue({ id: 'w1', question: 'Q', subjectId: null, relatedKnowledgeId: null })
      mockVault.knowledge.get.mockReturnValue(null)
      mockVault.subjects.get.mockReturnValue(null)

      const res = await GET_ONE(
        new NextRequest('http://localhost/api/wrong-questions/w1'),
        { params: Promise.resolve({ id: 'w1' }) },
      )

      expect(res.status).toBe(200)
    })

    it('应在错题不存在时返回 404', async () => {
      mockVault.wrongQuestions.get.mockReturnValue(null)

      const res = await GET_ONE(
        new NextRequest('http://localhost/api/wrong-questions/x'),
        { params: Promise.resolve({ id: 'x' }) },
      )

      expect(res.status).toBe(404)
    })
  })

  describe('DELETE /api/wrong-questions/:id', () => {
    it('应删除错题', async () => {
      mockVault.wrongQuestions.delete.mockReturnValue(undefined)

      const res = await DELETE(
        new NextRequest('http://localhost/api/wrong-questions/w1', { method: 'DELETE' }),
        { params: Promise.resolve({ id: 'w1' }) },
      )

      expect(res.status).toBe(200)
    })
  })

  describe('POST /api/wrong-questions/:id/explain (AI 解析)', () => {
    it('应在错题不存在时返回 404', async () => {
      mockVault.wrongQuestions.get.mockReturnValue(null)

      const res = await EXPLAIN(
        new NextRequest('http://localhost/api/wrong-questions/x/explain', { method: 'POST' }),
        { params: Promise.resolve({ id: 'x' }) },
      )

      expect(res.status).toBe(404)
    })

    it('应触发 AI 解析并保存结果', async () => {
      mockVault.wrongQuestions.get.mockReturnValue({
        id: 'w1', question: 'Q', questionType: 'short', options: '',
        myAnswer: 'A', correctAnswer: 'B', analysis: '', relatedKnowledgeId: null,
      })
      mockVault.knowledge.get.mockReturnValue(null)
      mockExplainWrongQuestion.mockResolvedValue({
        concept: '概念', whyWrong: '错因', howToFix: '思路', similarTip: '提醒',
      })
      mockVault.wrongQuestions.update.mockReturnValue({})

      const res = await EXPLAIN(
        new NextRequest('http://localhost/api/wrong-questions/w1/explain', { method: 'POST' }),
        { params: Promise.resolve({ id: 'w1' }) },
      )
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.explanation).toContain('概念')
      expect(data.structured.concept).toBe('概念')
      expect(mockVault.wrongQuestions.update).toHaveBeenCalledWith('w1', {
        aiExplanation: expect.stringContaining('概念'),
        status: 'reviewed',
      })
    })

    it('应在 AI 失败时返回 500', async () => {
      mockVault.wrongQuestions.get.mockReturnValue({
        id: 'w1', question: 'Q', questionType: 'short', options: '',
        myAnswer: '', correctAnswer: '', analysis: '', relatedKnowledgeId: null,
      })
      mockVault.knowledge.get.mockReturnValue(null)
      mockExplainWrongQuestion.mockRejectedValue(new Error('AI 不可用'))

      const res = await EXPLAIN(
        new NextRequest('http://localhost/api/wrong-questions/w1/explain', { method: 'POST' }),
        { params: Promise.resolve({ id: 'w1' }) },
      )

      expect(res.status).toBe(500)
    })
  })
})
