import { describe, it, expect, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { mockVault } from '../__mocks__/vault'
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
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          _count: { knowledgePoints: 5, wrongQuestions: 3, thinkingNotes: 2 },
        },
      ]
      mockVault.subjects.listWithCounts.mockReturnValue(mockData)

      const res = await GET()
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data).toHaveLength(1)
      expect(data[0].name).toBe('数学')
      expect(data[0]._count.knowledgePoints).toBe(5)
      expect(mockVault.subjects.listWithCounts).toHaveBeenCalled()
    })

    it('应在数据库为空时返回空数组', async () => {
      mockVault.subjects.listWithCounts.mockReturnValue([])

      const res = await GET()
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data).toEqual([])
    })
  })

  describe('POST /api/subjects', () => {
    it('应在 name 存在时创建学科', async () => {
      const created = { id: 's1', name: '物理', color: '#dc2626', icon: null }
      mockVault.subjects.create.mockReturnValue(created)

      const req = new NextRequest('http://localhost/api/subjects', {
        method: 'POST',
        body: JSON.stringify({ name: '物理', color: '#dc2626' }),
        headers: { 'Content-Type': 'application/json' },
      })
      const res = await POST(req)
      const data = await res.json()

      expect(res.status).toBe(201)
      expect(data.name).toBe('物理')
      expect(mockVault.subjects.create).toHaveBeenCalledWith({
        name: '物理',
        color: '#dc2626',
        icon: null,
      })
    })

    it('应在未提供 color 时使用默认色', async () => {
      mockVault.subjects.create.mockReturnValue({ id: 's1', name: 'X', color: '#16a34a', icon: null })

      const req = new NextRequest('http://localhost/api/subjects', {
        method: 'POST',
        body: JSON.stringify({ name: 'X' }),
        headers: { 'Content-Type': 'application/json' },
      })
      await POST(req)

      expect(mockVault.subjects.create).toHaveBeenCalledWith({
        name: 'X',
        color: undefined,
        icon: null,
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
      expect(mockVault.subjects.create).not.toHaveBeenCalled()
    })
  })

  describe('PUT /api/subjects/:id', () => {
    it('应更新指定学科', async () => {
      const updated = { id: 's1', name: '新名称', color: '#000', icon: 'X' }
      mockVault.subjects.update.mockReturnValue(updated)

      const req = new NextRequest('http://localhost/api/subjects/s1', {
        method: 'PUT',
        body: JSON.stringify({ name: '新名称', color: '#000', icon: 'X' }),
        headers: { 'Content-Type': 'application/json' },
      })
      const res = await PUT(req, { params: Promise.resolve({ id: 's1' }) })
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.name).toBe('新名称')
      expect(mockVault.subjects.update).toHaveBeenCalledWith('s1', {
        name: '新名称',
        color: '#000',
        icon: 'X',
      })
    })
  })

  describe('DELETE /api/subjects/:id', () => {
    it('应删除指定学科', async () => {
      mockVault.subjects.delete.mockReturnValue(undefined)

      const res = await DELETE(
        new NextRequest('http://localhost/api/subjects/s1', { method: 'DELETE' }),
        { params: Promise.resolve({ id: 's1' }) },
      )
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.ok).toBe(true)
      expect(mockVault.subjects.delete).toHaveBeenCalledWith('s1')
    })
  })
})
