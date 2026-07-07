import { describe, it, expect, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { mockDb } from '../__mocks__/db'
import { GET, POST } from '@/app/api/subjects/route'
import { PUT, DELETE } from '@/app/api/subjects/[id]/route'

describe('API /api/subjects', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/subjects', () => {
    it('应返回学科列表(含 _count)', async () => {
      const mockData = [
        {
          id: 's1',
          name: '数学',
          color: '#16a34a',
          icon: '📐',
          createdAt: new Date(),
          updatedAt: new Date(),
          _count: { knowledgePoints: 5, wrongQuestions: 3, thinkingNotes: 2 },
        },
      ]
      mockDb.subject.findMany.mockResolvedValue(mockData)

      const res = await GET()
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data).toHaveLength(1)
      expect(data[0].name).toBe('数学')
      expect(data[0]._count.knowledgePoints).toBe(5)
      expect(mockDb.subject.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'desc' },
          include: {
            _count: {
              select: {
                knowledgePoints: true,
                wrongQuestions: true,
                thinkingNotes: true,
              },
            },
          },
        }),
      )
    })

    it('应在数据库为空时返回空数组', async () => {
      mockDb.subject.findMany.mockResolvedValue([])

      const res = await GET()
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data).toEqual([])
    })
  })

  describe('POST /api/subjects', () => {
    it('应在 name 存在时创建学科', async () => {
      const created = { id: 's1', name: '物理', color: '#dc2626', icon: null }
      mockDb.subject.create.mockResolvedValue(created)

      const req = new NextRequest('http://localhost/api/subjects', {
        method: 'POST',
        body: JSON.stringify({ name: '物理', color: '#dc2626' }),
        headers: { 'Content-Type': 'application/json' },
      })
      const res = await POST(req)
      const data = await res.json()

      expect(res.status).toBe(201)
      expect(data.name).toBe('物理')
      expect(mockDb.subject.create).toHaveBeenCalledWith({
        data: { name: '物理', color: '#dc2626', icon: null },
      })
    })

    it('应在未提供 color 时使用默认色', async () => {
      mockDb.subject.create.mockResolvedValue({ id: 's1', name: 'X', color: '#16a34a', icon: null })

      const req = new NextRequest('http://localhost/api/subjects', {
        method: 'POST',
        body: JSON.stringify({ name: 'X' }),
        headers: { 'Content-Type': 'application/json' },
      })
      await POST(req)

      expect(mockDb.subject.create).toHaveBeenCalledWith({
        data: { name: 'X', color: '#16a34a', icon: null },
      })
    })

    it('应在 name 缺失时返回 400', async () => {
      const req = new NextRequest('http://localhost/api/subjects', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: { 'Content-Type': 'application/json' },
      })
      const res = await POST(req)

      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.error).toBe('name is required')
      expect(mockDb.subject.create).not.toHaveBeenCalled()
    })
  })

  describe('PUT /api/subjects/:id', () => {
    it('应更新指定学科', async () => {
      const updated = { id: 's1', name: '新名称', color: '#000', icon: 'X' }
      mockDb.subject.update.mockResolvedValue(updated)

      const req = new NextRequest('http://localhost/api/subjects/s1', {
        method: 'PUT',
        body: JSON.stringify({ name: '新名称', color: '#000', icon: 'X' }),
        headers: { 'Content-Type': 'application/json' },
      })
      const res = await PUT(req, { params: Promise.resolve({ id: 's1' }) })
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.name).toBe('新名称')
      expect(mockDb.subject.update).toHaveBeenCalledWith({
        where: { id: 's1' },
        data: { name: '新名称', color: '#000', icon: 'X' },
      })
    })

    it('应只更新提供的字段', async () => {
      mockDb.subject.update.mockResolvedValue({ id: 's1', name: '新', color: '#old', icon: null })

      const req = new NextRequest('http://localhost/api/subjects/s1', {
        method: 'PUT',
        body: JSON.stringify({ name: '新' }),
        headers: { 'Content-Type': 'application/json' },
      })
      await PUT(req, { params: Promise.resolve({ id: 's1' }) })

      expect(mockDb.subject.update).toHaveBeenCalledWith({
        where: { id: 's1' },
        data: { name: '新' },
      })
    })
  })

  describe('DELETE /api/subjects/:id', () => {
    it('应删除指定学科', async () => {
      mockDb.subject.delete.mockResolvedValue({})

      const res = await DELETE(
        new NextRequest('http://localhost/api/subjects/s1', { method: 'DELETE' }),
        { params: Promise.resolve({ id: 's1' }) },
      )
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.ok).toBe(true)
      expect(mockDb.subject.delete).toHaveBeenCalledWith({ where: { id: 's1' } })
    })
  })
})
