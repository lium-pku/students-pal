import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ThinkingModule } from '@/components/modules/Thinking'
import { Subject, ThinkingNote } from '@/lib/types'

const mockSubjects: Subject[] = [
  {
    id: 's1', name: '数学', color: '#16a34a', icon: '📐',
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  },
]

const mockNotes: ThinkingNote[] = [
  {
    id: 't1',
    title: '为什么负负得正?',
    question: '学生在学负数运算时总是问这个问题',
    content: '我觉得像否定否定就是肯定',
    aiReflection: '# AI 引导\n1. 问题一',
    aiMode: 'socratic',
    status: 'reflected',
    subjectId: 's1',
    subject: mockSubjects[0],
    relatedKnowledgeIds: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 't2',
    title: '关于乘法分配律',
    question: '',
    content: '',
    aiReflection: '',
    aiMode: 'socratic',
    status: 'draft',
    subjectId: null,
    subject: null,
    relatedKnowledgeIds: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

describe('ThinkingModule 组件', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation((url: string, opts?: any) => {
      const method = opts?.method || 'GET'
      if (url.includes('/api/thinking?') && method === 'GET') {
        return Promise.resolve({
          ok: true, status: 200,
          json: async () => mockNotes,
        })
      }
      if (url.includes('/api/thinking/') && method === 'POST') {
        // reflect API
        return Promise.resolve({
          ok: true, status: 200,
          json: async () => ({ reflection: '新引导', note: mockNotes[0] }),
        })
      }
      if (url.includes('/api/thinking') && method === 'POST') {
        return Promise.resolve({
          ok: true, status: 201,
          json: async () => mockNotes[0],
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

  it('应渲染标题和说明', () => {
    render(<ThinkingModule subjects={mockSubjects} onAskAI={vi.fn()} />)
    expect(screen.getByText('自主思考笔记')).toBeInTheDocument()
    expect(screen.getByText(/记录你独立的思考过程/)).toBeInTheDocument()
  })

  it('应渲染"新建思考"按钮', () => {
    render(<ThinkingModule subjects={mockSubjects} onAskAI={vi.fn()} />)
    expect(screen.getByRole('button', { name: /新建思考/ })).toBeInTheDocument()
  })

  it('应渲染笔记列表', async () => {
    render(<ThinkingModule subjects={mockSubjects} onAskAI={vi.fn()} />)
    expect(await screen.findByText('为什么负负得正?')).toBeInTheDocument()
    expect(screen.getByText('关于乘法分配律')).toBeInTheDocument()
  })

  it('应显示笔记的状态徽章', async () => {
    render(<ThinkingModule subjects={mockSubjects} onAskAI={vi.fn()} />)
    await screen.findByText('为什么负负得正?')
    expect(screen.getByText('已获引导')).toBeInTheDocument()
    expect(screen.getByText('草稿')).toBeInTheDocument()
  })

  it('点击"新建思考"应打开对话框', async () => {
    render(<ThinkingModule subjects={mockSubjects} onAskAI={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /新建思考/ }))
    // 对话框中应出现"思考的起点 / 问题"标签
    await waitFor(() => {
      expect(screen.getByText('思考的起点 / 问题')).toBeInTheDocument()
    })
  })

  it('点击笔记卡片应打开详情对话框', async () => {
    render(<ThinkingModule subjects={mockSubjects} onAskAI={vi.fn()} />)
    const note = await screen.findByText('为什么负负得正?')
    fireEvent.click(note.closest('button') || note)
    // 详情对话框中应出现"AI 学伴引导"区域
    await waitFor(() => {
      expect(screen.getByText('AI 学伴引导')).toBeInTheDocument()
    })
    // 应出现 4 种引导模式(用 getAllByText 因为有些可能在 badge 中也出现)
    expect(screen.getAllByText(/苏格拉底提问/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/思考镜子/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/理性辩手/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/知识拓展员/).length).toBeGreaterThan(0)
  })

  it('已有 AI 引导的笔记应在详情中显示引导内容', async () => {
    render(<ThinkingModule subjects={mockSubjects} onAskAI={vi.fn()} />)
    const note = await screen.findByText('为什么负负得正?')
    fireEvent.click(note.closest('button') || note)
    await waitFor(() => {
      expect(screen.getByText('AI 学伴引导')).toBeInTheDocument()
    })
    // 应显示原 AI 引导文本中的"问题一"
    expect(screen.getByText('问题一')).toBeInTheDocument()
  })

  it('点击"与 AI 对话"应调用 onAskAI', async () => {
    const onAskAI = vi.fn()
    render(<ThinkingModule subjects={mockSubjects} onAskAI={onAskAI} />)
    fireEvent.click(await screen.findByText('为什么负负得正?'))
    await waitFor(() => {
      expect(screen.getByText('与 AI 对话')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByText('与 AI 对话'))
    expect(onAskAI).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'thinking',
        title: '为什么负负得正?',
        id: 't1',
      }),
    )
  })

  it('应支持关键词搜索', async () => {
    render(<ThinkingModule subjects={mockSubjects} onAskAI={vi.fn()} />)
    await screen.findByText('为什么负负得正?')
    const searchInput = screen.getByPlaceholderText(/搜索标题或内容/)
    fireEvent.change(searchInput, { target: { value: '负负得正' } })
    // 应触发新的 API 调用(带 q 参数)— URL 中的中文可能被编码
    await waitFor(() => {
      const calls = (fetch as any).mock.calls.filter(
        ([url]: any) => url.includes('q=') && (
          url.includes('负负得正') || url.includes(encodeURIComponent('负负得正'))
        )
      )
      expect(calls.length).toBeGreaterThan(0)
    }, { timeout: 3000 })
  })

  it('点击"让 AI 引导我思考"应调用 reflect API', async () => {
    render(<ThinkingModule subjects={mockSubjects} onAskAI={vi.fn()} />)
    const note = await screen.findByText('为什么负负得正?')
    fireEvent.click(note.closest('button') || note)
    await waitFor(() => {
      expect(screen.getByText('AI 学伴引导')).toBeInTheDocument()
    })
    // 点击"让 AI 引导我思考"按钮(可能叫"重新让 AI 引导"因为已有 reflection)
    const reflectBtn = screen.getByRole('button', { name: /重新让 AI 引导|让 AI 引导我思考/ })
    fireEvent.click(reflectBtn)
    await waitFor(() => {
      const reflectCalls = (fetch as any).mock.calls.filter(
        ([url, opts]: any) => url.includes('/reflect') && opts?.method === 'POST'
      )
      expect(reflectCalls.length).toBeGreaterThan(0)
    })
  })

  it('点击"删除"应弹出确认', async () => {
    vi.stubGlobal('confirm', vi.fn().mockReturnValue(false))
    render(<ThinkingModule subjects={mockSubjects} onAskAI={vi.fn()} />)
    const note = await screen.findByText('为什么负负得正?')
    fireEvent.click(note.closest('button') || note)
    await waitFor(() => {
      expect(screen.getByText('AI 学伴引导')).toBeInTheDocument()
    })
    const deleteBtn = screen.getByRole('button', { name: /删除/ })
    fireEvent.click(deleteBtn)
    expect(confirm).toHaveBeenCalled()
  })

  it('新建笔记时 title 为空应显示错误提示', async () => {
    render(<ThinkingModule subjects={mockSubjects} onAskAI={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /新建思考/ }))
    await waitFor(() => {
      expect(screen.getByText('思考的起点 / 问题')).toBeInTheDocument()
    })
    // 直接点保存(不填 title)
    const saveBtn = screen.getByRole('button', { name: '保存' })
    fireEvent.click(saveBtn)
    // 不应调用 POST /api/thinking
    const postCalls = (fetch as any).mock.calls.filter(
      ([url, opts]: any) => url === '/api/thinking' && opts?.method === 'POST'
    )
    expect(postCalls.length).toBe(0)
  })

  it('新建笔记填好 title 后保存应调用 API', async () => {
    render(<ThinkingModule subjects={mockSubjects} onAskAI={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /新建思考/ }))
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/例如：为什么乘法/)).toBeInTheDocument()
    })
    const titleInput = screen.getByPlaceholderText(/例如：为什么乘法/)
    fireEvent.change(titleInput, { target: { value: '新笔记' } })
    fireEvent.click(screen.getByRole('button', { name: '保存' }))
    await waitFor(() => {
      const postCalls = (fetch as any).mock.calls.filter(
        ([url, opts]: any) => url === '/api/thinking' && opts?.method === 'POST'
      )
      expect(postCalls.length).toBe(1)
    })
  })
})
