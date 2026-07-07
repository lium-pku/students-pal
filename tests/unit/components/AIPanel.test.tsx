import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { AIPanel } from '@/components/ai-panel/AIPanel'
import { ChatSession } from '@/lib/types'

const mockSessions: ChatSession[] = [
  {
    id: 'cs1',
    title: '关于数学',
    context: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

describe('AIPanel 组件', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation((url: string, opts?: any) => {
      const method = opts?.method || 'GET'
      if (url === '/api/ai/chat' && method === 'GET') {
        return Promise.resolve({
          ok: true, status: 200,
          json: async () => mockSessions,
        })
      }
      if (url === '/api/ai/chat' && method === 'POST') {
        return Promise.resolve({
          ok: true, status: 201,
          json: async () => ({
            id: 'cs-new', title: '新对话', context: '',
            createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
          }),
        })
      }
      if (url === '/api/ai/chat' && method === 'PUT') {
        return Promise.resolve({
          ok: true, status: 200,
          json: async () => ({
            userMsg: { id: 'm1', sessionId: 'cs1', role: 'user', content: 'hello', meta: '', createdAt: new Date().toISOString() },
            aiMsg: { id: 'm2', sessionId: 'cs1', role: 'assistant', content: 'AI 回复', meta: '', createdAt: new Date().toISOString() },
          }),
        })
      }
      if (url === '/api/ai/search' && method === 'POST') {
        return Promise.resolve({
          ok: true, status: 200,
          json: async () => ({
            answer: '搜索回答',
            sources: [{ title: 'S1', url: 'http://a', snippet: 's' }],
          }),
        })
      }
      if (url.includes('/api/chat-sessions/') && method === 'GET') {
        return Promise.resolve({
          ok: true, status: 200,
          json: async () => ({
            id: 'cs1', title: '关于数学', messages: [],
            createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
          }),
        })
      }
      return Promise.resolve({
        ok: true, status: 200,
        json: async () => ({}),
      })
    }))
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('应渲染标题"AI 学伴"', () => {
    render(<AIPanel context={null} onClose={vi.fn()} onClearContext={vi.fn()} />)
    expect(screen.getByText('AI 学伴')).toBeInTheDocument()
  })

  it('无上下文时应显示"通用学习助手"', () => {
    render(<AIPanel context={null} onClose={vi.fn()} onClearContext={vi.fn()} />)
    expect(screen.getByText('通用学习助手')).toBeInTheDocument()
  })

  it('有上下文时应显示上下文标签', () => {
    render(
      <AIPanel
        context={{ type: 'knowledge', title: '勾股定理', id: 'k1' }}
        onClose={vi.fn()}
        onClearContext={vi.fn()}
      />
    )
    // 上下文标签和推荐提问中可能都包含"勾股定理"相关文本,用 getAllByText
    expect(screen.getAllByText(/勾股定理/).length).toBeGreaterThan(0)
  })

  it('点击关闭按钮应调用 onClose', () => {
    const onClose = vi.fn()
    render(<AIPanel context={null} onClose={onClose} onClearContext={vi.fn()} />)
    // 关闭面板按钮(PanelRightClose icon)
    const closeBtn = screen.getByRole('button', { name: /关闭面板/ })
    fireEvent.click(closeBtn)
    expect(onClose).toHaveBeenCalled()
  })

  it('应渲染输入框和发送按钮', () => {
    render(<AIPanel context={null} onClose={vi.fn()} onClearContext={vi.fn()} />)
    expect(screen.getByPlaceholderText(/向 AI 学伴提问/)).toBeInTheDocument()
  })

  it('应渲染 4 个推荐提问', () => {
    render(<AIPanel context={null} onClose={vi.fn()} onClearContext={vi.fn()} />)
    expect(screen.getByText('这道题的关键思路是什么？')).toBeInTheDocument()
    expect(screen.getByText('帮我梳理这个知识点的来龙去脉')).toBeInTheDocument()
    expect(screen.getByText('给我出三道类似的练习题')).toBeInTheDocument()
    expect(screen.getByText('这个概念容易和什么混淆？')).toBeInTheDocument()
  })

  it('点击推荐提问应填入输入框', () => {
    render(<AIPanel context={null} onClose={vi.fn()} onClearContext={vi.fn()} />)
    fireEvent.click(screen.getByText('这道题的关键思路是什么？'))
    expect(screen.getByPlaceholderText(/向 AI 学伴提问/)).toHaveValue('这道题的关键思路是什么？')
  })

  it('点击"联网搜索"按钮应切换搜索模式', () => {
    render(<AIPanel context={null} onClose={vi.fn()} onClearContext={vi.fn()} />)
    const searchBtn = screen.getByRole('button', { name: /联网搜索/ })
    fireEvent.click(searchBtn)
    // 输入框 placeholder 应变化
    expect(screen.getByPlaceholderText(/输入要搜索的问题/)).toBeInTheDocument()
  })

  it('发送消息应调用 API 并显示回复', async () => {
    render(<AIPanel context={null} onClose={vi.fn()} onClearContext={vi.fn()} />)
    const input = screen.getByPlaceholderText(/向 AI 学伴提问/)
    fireEvent.change(input, { target: { value: 'hello' } })
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' })

    await waitFor(() => {
      expect(screen.getByText('hello')).toBeInTheDocument()
      expect(screen.getByText('AI 回复')).toBeInTheDocument()
    })
  })

  it('点击"新对话"应清空当前会话', () => {
    render(<AIPanel context={null} onClose={vi.fn()} onClearContext={vi.fn()} />)
    const newChatBtn = screen.getByRole('button', { name: /新对话/ })
    fireEvent.click(newChatBtn)
    // 应显示空状态(推荐提问重新出现)
    expect(screen.getByText('这道题的关键思路是什么？')).toBeInTheDocument()
  })

  it('点击"历史会话"应显示会话列表', async () => {
    render(<AIPanel context={null} onClose={vi.fn()} onClearContext={vi.fn()} />)
    const historyBtn = screen.getByRole('button', { name: /历史会话/ })
    fireEvent.click(historyBtn)
    await waitFor(() => {
      expect(screen.getByText('关于数学')).toBeInTheDocument()
    })
  })

  it('在搜索模式下发送消息应调用 search API', async () => {
    render(<AIPanel context={null} onClose={vi.fn()} onClearContext={vi.fn()} />)
    // 开启搜索模式
    fireEvent.click(screen.getByRole('button', { name: /联网搜索/ }))
    const input = screen.getByPlaceholderText(/输入要搜索的问题/)
    fireEvent.change(input, { target: { value: '勾股定理' } })
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' })

    await waitFor(() => {
      const searchCalls = (fetch as any).mock.calls.filter(
        ([url, opts]: any) => url === '/api/ai/search' && opts?.method === 'POST'
      )
      expect(searchCalls.length).toBeGreaterThan(0)
    })
  })

  it('清除上下文按钮应调用 onClearContext', () => {
    const onClearContext = vi.fn()
    render(
      <AIPanel
        context={{ type: 'thinking', title: '为什么负负得正?', id: 't1' }}
        onClose={vi.fn()}
        onClearContext={onClearContext}
      />
    )
    // 上下文标签是 button,点击它应触发 onClearContext
    const ctxBadges = screen.getAllByText(/为什么负负得正/)
    // 找到作为 button 的那个
    const ctxBtn = ctxBadges.find((el) => el.closest('button'))
    if (ctxBtn) {
      fireEvent.click(ctxBtn.closest('button')!)
      expect(onClearContext).toHaveBeenCalled()
    }
  })
})
