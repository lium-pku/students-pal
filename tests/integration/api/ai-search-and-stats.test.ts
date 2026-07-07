import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { mockDb } from '../__mocks__/db'

const mockAiSearch = vi.fn()
vi.mock('@/lib/ai', () => ({
  aiSearch: (...args: any[]) => mockAiSearch(...args),
}))

import { POST } from '@/app/api/ai/search/route'
import { GET as GET_STATS } from '@/app/api/stats/route'

describe('API /api/ai/search', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('应在 query 缺失时返回 400', async () => {
    const req = new NextRequest('http://localhost/api/ai/search', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)

    expect(res.status).toBe(400)
  })

  it('应调用 aiSearch 并返回结果', async () => {
    mockAiSearch.mockResolvedValue({
      answer: '基于搜索的回答',
      sources: [{ title: 'S1', url: 'http://a', snippet: 's' }],
    })

    const req = new NextRequest('http://localhost/api/ai/search', {
      method: 'POST',
      body: JSON.stringify({ query: '勾股定理', context: 'C' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.answer).toBe('基于搜索的回答')
    expect(data.sources).toHaveLength(1)
    expect(mockAiSearch).toHaveBeenCalledWith({ query: '勾股定理', context: 'C' })
  })
})

describe('API /api/stats', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  function setupStatsMocks(opts: {
    subjects?: number
    knowledgePoints?: number
    thinkingNotes?: number
    wrongQuestions?: number
    unresolved?: number
    mastered?: number
    reviewed?: number
    avgMastery?: number | null
  } = {}) {
    const {
      subjects = 2,
      knowledgePoints = 5,
      thinkingNotes = 3,
      wrongQuestions = 4,
      unresolved = 1,
      mastered = 1,
      reviewed = 2,
      avgMastery = 60,
    } = opts

    mockDb.subject.count.mockResolvedValue(subjects)
    mockDb.knowledgePoint.count.mockResolvedValue(knowledgePoints)
    mockDb.thinkingNote.count.mockResolvedValue(thinkingNotes)
    // wrongQuestion.count 被调用多次:总数 + unresolved + mastered + reviewed
    mockDb.wrongQuestion.count
      .mockResolvedValueOnce(wrongQuestions) // 总数
      .mockResolvedValueOnce(unresolved)     // unresolved
      .mockResolvedValueOnce(mastered)       // mastered
      .mockResolvedValueOnce(reviewed)       // reviewed
    mockDb.thinkingNote.findMany.mockResolvedValue([])
    mockDb.wrongQuestion.findMany.mockResolvedValue([])
    mockDb.knowledgePoint.findMany.mockResolvedValue([])
    if (avgMastery === null) {
      mockDb.knowledgePoint.aggregate.mockResolvedValue({ _avg: { mastery: null } })
    } else {
      mockDb.knowledgePoint.aggregate.mockResolvedValue({ _avg: { mastery: avgMastery } })
    }
  }

  it('应返回统计数据结构', async () => {
    setupStatsMocks()

    const res = await GET_STATS(new NextRequest('http://localhost/api/stats'))
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.counts).toBeDefined()
    expect(data.counts.subjects).toBe(2)
    expect(data.counts.knowledgePoints).toBe(5)
    expect(data.counts.thinkingNotes).toBe(3)
    expect(data.counts.wrongQuestions).toBe(4)
    expect(data.wrongStats).toBeDefined()
    expect(data.wrongStats.unresolved).toBe(1)
    expect(data.wrongStats.mastered).toBe(1)
    expect(data.wrongStats.reviewed).toBe(2)
    expect(data.avgMastery).toBe(60)
    expect(data.daily).toBeDefined()
    expect(data.daily).toHaveLength(7)
  })

  it('应在无知识点时 avgMastery 为 0', async () => {
    setupStatsMocks({ knowledgePoints: 0 })

    const res = await GET_STATS(new NextRequest('http://localhost/api/stats'))
    const data = await res.json()

    expect(data.avgMastery).toBe(0)
    // 不应调用 aggregate
    expect(mockDb.knowledgePoint.aggregate).not.toHaveBeenCalled()
  })

  it('daily 数组应包含 7 天数据,每项有 thinking/wrong/knowledge', async () => {
    setupStatsMocks()

    const res = await GET_STATS(new NextRequest('http://localhost/api/stats'))
    const data = await res.json()

    expect(data.daily).toHaveLength(7)
    data.daily.forEach((d: any) => {
      expect(d).toHaveProperty('date')
      expect(d).toHaveProperty('thinking')
      expect(d).toHaveProperty('wrong')
      expect(d).toHaveProperty('knowledge')
    })
  })

  it('应支持 days 参数', async () => {
    setupStatsMocks()

    await GET_STATS(new NextRequest('http://localhost/api/stats?days=7'))

    // findMany 应该用 7 天前的时间作为 since
    expect(mockDb.thinkingNote.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          createdAt: expect.objectContaining({ gte: expect.any(Date) }),
        }),
      }),
    )
  })
})
