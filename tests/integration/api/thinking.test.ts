import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { mockVault } from '../__mocks__/vault'

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
      mockVault.thinking.list.mockReturnValue([
        { id: 't1', title: 'T1', content: 'C', status: 'draft', subject: null },
      ])

      const res = await GET(new NextRequest('http://localhost/api/thinking'))
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data).toHaveLength(1)
    })

    it('应支持按学科和状态过滤', async () => {
      mockVault.thinking.list.mockReturnValue([])

      await GET(new NextRequest('http://localhost/api/thinking?subjectId=s1&status=reflected'))

      expect(mockVault.thinking.list).toHaveBeenCalledWith({ subjectId: 's1', status: 'reflected', q: undefined })
    })

    it('应支持关键词搜索', async () => {
      mockVault.thinking.list.mockReturnValue([])

      await GET(new NextRequest('http://localhost/api/thinking?q=负数'))

      expect(mockVault.thinking.list).toHaveBeenCalledWith({ subjectId: undefined, status: undefined, q: '负数' })
    })
  })

  describe('POST /api/thinking', () => {
    it('应在 title 存在时创建笔记', async () => {
      mockVault.thinking.create.mockReturnValue({
        id: 't1', title: 'T', content: '', question: '', status: 'draft',
      })

      const req = new NextRequest('http://localhost/api/thinking', {
        method: 'POST',
        body: JSON.stringify({ title: 'T', question: 'Q' }),
        headers: { 'Content-Type': 'application/json' },
      })
      const res = await POST(req)

      expect(res.status).toBe(201)
      expect(mockVault.thinking.create).toHaveBeenCalledWith({
        title: 'T',
        content: '',
        question: 'Q',
        subjectId: null,
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
      mockVault.thinking.get.mockReturnValue({ id: 't1', title: 'T' })

      const res = await GET_ONE(
        new NextRequest('http://localhost/api/thinking/t1'),
        { params: Promise.resolve({ id: 't1' }) },
      )

      expect(res.status).toBe(200)
    })

    it('应在笔记不存在时返回 404', async () => {
      mockVault.thinking.get.mockReturnValue(null)

      const res = await GET_ONE(
        new NextRequest('http://localhost/api/thinking/x'),
        { params: Promise.resolve({ id: 'x' }) },
      )

      expect(res.status).toBe(404)
    })
  })

  describe('DELETE /api/thinking/:id', () => {
    it('应删除笔记', async () => {
      mockVault.thinking.delete.mockReturnValue(undefined)

      const res = await DELETE(
        new NextRequest('http://localhost/api/thinking/t1', { method: 'DELETE' }),
        { params: Promise.resolve({ id: 't1' }) },
      )

      expect(res.status).toBe(200)
    })
  })

  describe('POST /api/thinking/:id/reflect (AI 引导)', () => {
    it('应在笔记不存在时返回 404', async () => {
      mockVault.thinking.get.mockReturnValue(null)

      const res = await REFLECT(
        new NextRequest('http://localhost/api/thinking/x/reflect', { method: 'POST' }),
        { params: Promise.resolve({ id: 'x' }) },
      )

      expect(res.status).toBe(404)
    })

    it('应触发 AI 引导并保存结果', async () => {
      mockVault.thinking.get.mockReturnValue({
        id: 't1', title: 'T', question: 'Q', content: 'C',
        subject: null, relatedKnowledgeIds: [],
      })
      mockReflectOnThinking.mockResolvedValue('# AI 引导内容')
      mockVault.thinking.update.mockReturnValue({})

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
      expect(mockVault.thinking.update).toHaveBeenCalledTimes(2)
    })

    it('应在未指定 mode 时默认 socratic', async () => {
      mockVault.thinking.get.mockReturnValue({
        id: 't1', title: 'T', question: '', content: '', subject: null, relatedKnowledgeIds: [],
      })
      mockReflectOnThinking.mockResolvedValue('R')
      mockVault.thinking.update.mockReturnValue({})

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
      mockVault.thinking.get.mockReturnValue({
        id: 't1', title: 'T', question: '', content: '', subject: null, relatedKnowledgeIds: [],
      })
      mockReflectOnThinking.mockRejectedValue(new Error('AI 不可用'))
      mockVault.thinking.update.mockReturnValue({})

      const req = new NextRequest('http://localhost/api/thinking/t1/reflect', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: { 'Content-Type': 'application/json' },
      })
      const res = await REFLECT(req, { params: Promise.resolve({ id: 't1' }) })

      expect(res.status).toBe(500)
      // 应该有 3 次更新:reflecting → 回滚到 draft
      expect(mockVault.thinking.update.mock.calls.some(
        (c) => c[1].status === 'draft'
      )).toBe(true)
    })

    it('应注入相关知识点上下文', async () => {
      mockVault.thinking.get.mockReturnValue({
        id: 't1', title: 'T', question: '', content: '', subject: null,
        relatedKnowledgeIds: ['k1', 'k2'],
      })
      mockVault.knowledge.get.mockImplementation((id: string) =>
        id === 'k1' ? { id: 'k1', title: 'KP1', content: '内容1' } :
        id === 'k2' ? { id: 'k2', title: 'KP2', content: '内容2' } : null
      )
      mockReflectOnThinking.mockResolvedValue('R')
      mockVault.thinking.update.mockReturnValue({})

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
