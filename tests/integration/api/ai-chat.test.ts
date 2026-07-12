import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { mockVault } from '../__mocks__/vault'

const mockChatWithAI = vi.fn()
const mockGenerateChatTitle = vi.fn()
vi.mock('@/lib/ai', () => ({
  chatWithAI: (...args: any[]) => mockChatWithAI(...args),
  generateChatTitle: (...args: any[]) => mockGenerateChatTitle(...args),
}))

import { GET, POST, PUT } from '@/app/api/ai/chat/route'
import { GET as GET_SESSION, DELETE } from '@/app/api/chat-sessions/[id]/route'

describe('API /api/ai/chat', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/ai/chat', () => {
    it('应返回会话列表', async () => {
      mockVault.chats.list.mockReturnValue([
        { id: 'cs1', title: 'T1', context: '', messages: [{ content: 'first' }], createdAt: '', updatedAt: '' },
      ])

      const res = await GET()
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data).toHaveLength(1)
      expect(data[0].title).toBe('T1')
    })
  })

  describe('POST /api/ai/chat', () => {
    it('应创建会话', async () => {
      mockVault.chats.create.mockReturnValue({ id: 'cs1', title: '新对话' })

      const req = new NextRequest('http://localhost/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({ title: '测试' }),
        headers: { 'Content-Type': 'application/json' },
      })
      const res = await POST(req)

      expect(res.status).toBe(201)
      expect(mockVault.chats.create).toHaveBeenCalledWith({ title: '测试', context: '' })
    })
  })

  describe('PUT /api/ai/chat (发送消息)', () => {
    it('应在缺少 sessionId 或 content 时返回 400', async () => {
      const req = new NextRequest('http://localhost/api/ai/chat', {
        method: 'PUT',
        body: JSON.stringify({}),
        headers: { 'Content-Type': 'application/json' },
      })
      const res = await PUT(req)

      expect(res.status).toBe(400)
    })

    it('应在会话不存在时返回 404', async () => {
      mockVault.chats.get.mockReturnValue(null)

      const req = new NextRequest('http://localhost/api/ai/chat', {
        method: 'PUT',
        body: JSON.stringify({ sessionId: 'x', content: 'hello' }),
        headers: { 'Content-Type': 'application/json' },
      })
      const res = await PUT(req)

      expect(res.status).toBe(404)
    })

    it('应保存用户消息 + 调用 AI + 保存 AI 回复', async () => {
      mockVault.chats.get.mockReturnValue({
        id: 'cs1', title: '已有标题', messages: [],
      })
      mockVault.chats.addMessage.mockImplementation((_sessionId: string, msg: any) => ({
        id: 'm-' + msg.role, sessionId: _sessionId, ...msg,
      }))
      mockChatWithAI.mockResolvedValue('AI 回复')
      mockVault.chats.update.mockReturnValue({})

      const req = new NextRequest('http://localhost/api/ai/chat', {
        method: 'PUT',
        body: JSON.stringify({ sessionId: 'cs1', content: 'hello' }),
        headers: { 'Content-Type': 'application/json' },
      })
      const res = await PUT(req)
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.userMsg.content).toBe('hello')
      expect(data.aiMsg.content).toBe('AI 回复')
      expect(mockVault.chats.addMessage).toHaveBeenCalledTimes(2)
    })

    it('应在 AI 失败时返回错误消息', async () => {
      mockVault.chats.get.mockReturnValue({ id: 'cs1', title: 'T', messages: [] })
      mockVault.chats.addMessage.mockImplementation((_sessionId: string, msg: any) => ({
        id: 'm-' + msg.role, sessionId: _sessionId, ...msg,
      }))
      mockChatWithAI.mockRejectedValue(new Error('AI 不可用'))

      const req = new NextRequest('http://localhost/api/ai/chat', {
        method: 'PUT',
        body: JSON.stringify({ sessionId: 'cs1', content: 'hello' }),
        headers: { 'Content-Type': 'application/json' },
      })
      const res = await PUT(req)
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.aiMsg.content).toContain('AI 暂时不可用')
    })

    it('应在首条消息且标题为"新对话"时自动生成标题', async () => {
      mockVault.chats.get.mockReturnValue({ id: 'cs1', title: '新对话', messages: [] })
      mockVault.chats.addMessage.mockImplementation((_sessionId: string, msg: any) => ({
        id: 'm-' + msg.role, sessionId: _sessionId, ...msg,
      }))
      mockChatWithAI.mockResolvedValue('R')
      mockGenerateChatTitle.mockResolvedValue('关于数学')
      mockVault.chats.update.mockReturnValue({})

      const req = new NextRequest('http://localhost/api/ai/chat', {
        method: 'PUT',
        body: JSON.stringify({ sessionId: 'cs1', content: '什么是数学?' }),
        headers: { 'Content-Type': 'application/json' },
      })
      await PUT(req)

      expect(mockGenerateChatTitle).toHaveBeenCalledWith('什么是数学?')
      expect(mockVault.chats.update).toHaveBeenCalledWith('cs1', { title: '关于数学' })
    })

    it('应根据上下文类型构建 system prompt', async () => {
      mockVault.chats.get.mockReturnValue({ id: 'cs1', title: 'T', messages: [] })
      mockVault.chats.addMessage.mockImplementation((_sessionId: string, msg: any) => ({
        id: 'm-' + msg.role, sessionId: _sessionId, ...msg,
      }))
      mockChatWithAI.mockResolvedValue('R')

      const contextType = JSON.stringify({
        type: 'knowledge', title: '勾股定理', content: '直角三角形...',
      })
      const req = new NextRequest('http://localhost/api/ai/chat', {
        method: 'PUT',
        body: JSON.stringify({ sessionId: 'cs1', content: 'Q', contextType }),
        headers: { 'Content-Type': 'application/json' },
      })
      await PUT(req)

      const callArg = mockChatWithAI.mock.calls[0][0]
      const sysMsg = callArg[0]
      expect(sysMsg.role).toBe('system')
      expect(sysMsg.content).toContain('勾股定理')
    })
  })
})

describe('API /api/chat-sessions/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('GET 应返回会话含全部消息', async () => {
    mockVault.chats.get.mockReturnValue({
      id: 'cs1', title: 'T', messages: [
        { id: 'm1', role: 'user', content: 'Q' },
        { id: 'm2', role: 'assistant', content: 'A' },
      ],
    })

    const res = await GET_SESSION(
      new NextRequest('http://localhost/api/chat-sessions/cs1'),
      { params: Promise.resolve({ id: 'cs1' }) },
    )
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.messages).toHaveLength(2)
  })

  it('GET 应在会话不存在时返回 404', async () => {
    mockVault.chats.get.mockReturnValue(null)

    const res = await GET_SESSION(
      new NextRequest('http://localhost/api/chat-sessions/x'),
      { params: Promise.resolve({ id: 'x' }) },
    )

    expect(res.status).toBe(404)
  })

  it('DELETE 应删除会话', async () => {
    mockVault.chats.delete.mockReturnValue(undefined)

    const res = await DELETE(
      new NextRequest('http://localhost/api/chat-sessions/cs1', { method: 'DELETE' }),
      { params: Promise.resolve({ id: 'cs1' }) },
    )

    expect(res.status).toBe(200)
    expect(mockVault.chats.delete).toHaveBeenCalledWith('cs1')
  })
})
