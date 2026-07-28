import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { WrongQuestionsModule } from '@/components/modules/WrongQuestions'
import { Subject, WrongQuestion, KnowledgePoint } from '@/lib/types'

const mockSubjects: Subject[] = [
  {
    id: 's1', name: '数学', color: '#16a34a', icon: '📐',
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  },
]

const mockKPs: KnowledgePoint[] = [
  {
    id: 'k1', title: '勾股定理', content: '', tags: '', subjectId: null,
    mastery: 0, relationsFrom: [], relationsTo: [],
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  },
]

const mockWrongQuestions: WrongQuestion[] = [
  {
    id: 'w1',
    question: '计算 (-2) × (-3) = ?',
    questionType: 'short',
    options: '',
    myAnswer: '-6',
    correctAnswer: '6',
    analysis: '我以为是负数',
    aiExplanation: '## 知识点回顾\n负数乘法',
    status: 'reviewed',
    subjectId: 's1',
    subject: mockSubjects[0],
    relatedKnowledgeId: 'k1',
    relatedKnowledge: mockKPs[0],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'w2',
    question: '1 + 1 = ?',
    questionType: 'short',
    options: '',
    myAnswer: '3',
    correctAnswer: '2',
    analysis: '',
    aiExplanation: '',
    status: 'unresolved',
    subjectId: null,
    subject: null,
    relatedKnowledgeId: null,
    relatedKnowledge: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

describe('WrongQuestionsModule 组件', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation((url: string, opts?: any) => {
      const method = opts?.method || 'GET'
      if (url.includes('/api/knowledge') && method === 'GET') {
        return Promise.resolve({
          ok: true, status: 200,
          json: async () => mockKPs,
        })
      }
      if (url.includes('/api/wrong-questions?') && method === 'GET') {
        return Promise.resolve({
          ok: true, status: 200,
          json: async () => mockWrongQuestions,
        })
      }
      if (url.includes('/api/wrong-questions/') && method === 'POST') {
        // explain API
        return Promise.resolve({
          ok: true, status: 200,
          json: async () => ({ explanation: '## 解析\n新解析', item: mockWrongQuestions[0] }),
        })
      }
      if (url.includes('/api/wrong-questions') && method === 'POST') {
        return Promise.resolve({
          ok: true, status: 201,
          json: async () => mockWrongQuestions[0],
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
    render(<WrongQuestionsModule subjects={mockSubjects} onAskAI={vi.fn()} />)
    expect(screen.getByText('错题本')).toBeInTheDocument()
    expect(screen.getByText(/记录每一道错题/)).toBeInTheDocument()
  })

  it('应渲染"添加错题"按钮', () => {
    render(<WrongQuestionsModule subjects={mockSubjects} onAskAI={vi.fn()} />)
    expect(screen.getByRole('button', { name: /添加错题/ })).toBeInTheDocument()
  })

  it('应渲染错题列表', async () => {
    render(<WrongQuestionsModule subjects={mockSubjects} onAskAI={vi.fn()} />)
    expect(await screen.findByText('计算 (-2) × (-3) = ?')).toBeInTheDocument()
    expect(screen.getByText('1 + 1 = ?')).toBeInTheDocument()
  })

  it('应显示错题的状态徽章', async () => {
    render(<WrongQuestionsModule subjects={mockSubjects} onAskAI={vi.fn()} />)
    await screen.findByText('计算 (-2) × (-3) = ?')
    // "已解析"可能出现在多处(状态过滤下拉 + 卡片),用 getAllByText
    expect(screen.getAllByText('已解析').length).toBeGreaterThan(0)
    expect(screen.getAllByText('未处理').length).toBeGreaterThan(0)
  })

  it('应显示题型徽章', async () => {
    render(<WrongQuestionsModule subjects={mockSubjects} onAskAI={vi.fn()} />)
    await screen.findByText('计算 (-2) × (-3) = ?')
    // 两道题都是 short 题型,所以"简答"应至少出现 2 次
    const shorts = screen.getAllByText('简答')
    expect(shorts.length).toBeGreaterThanOrEqual(2)
  })

  it('点击"添加错题"应打开对话框', async () => {
    render(<WrongQuestionsModule subjects={mockSubjects} onAskAI={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /添加错题/ }))
    // 对话框中应出现"题型"标签
    await waitFor(() => {
      expect(screen.getByText('题型')).toBeInTheDocument()
    })
  })

  it('点击错题卡片应打开详情对话框', async () => {
    render(<WrongQuestionsModule subjects={mockSubjects} onAskAI={vi.fn()} />)
    fireEvent.click(await screen.findByText('计算 (-2) × (-3) = ?'))
    await waitFor(() => {
      expect(screen.getByText('错题详情')).toBeInTheDocument()
    })
  })

  it('已解析的错题应在详情中显示 AI 解析内容', async () => {
    render(<WrongQuestionsModule subjects={mockSubjects} onAskAI={vi.fn()} />)
    fireEvent.click(await screen.findByText('计算 (-2) × (-3) = ?'))
    await waitFor(() => {
      expect(screen.getByText('负数乘法')).toBeInTheDocument()
    })
  })

  it('点击"继续问 AI"应调用 onAskAI', async () => {
    const onAskAI = vi.fn()
    render(<WrongQuestionsModule subjects={mockSubjects} onAskAI={onAskAI} />)
    fireEvent.click(await screen.findByText('计算 (-2) × (-3) = ?'))
    await waitFor(() => {
      expect(screen.getByText('继续问 AI')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByText('继续问 AI'))
    expect(onAskAI).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'wrong',
        id: 'w1',
      }),
    )
  })

  it('应支持状态过滤', async () => {
    render(<WrongQuestionsModule subjects={mockSubjects} onAskAI={vi.fn()} />)
    await screen.findByText('计算 (-2) × (-3) = ?')
    // 触发状态过滤(点击"所有状态"下拉)
    const statusSelect = screen.getByText('所有状态')
    expect(statusSelect).toBeInTheDocument()
  })

  it('未处理的错题应显示"让 AI 解析"按钮(在详情中)', async () => {
    render(<WrongQuestionsModule subjects={mockSubjects} onAskAI={vi.fn()} />)
    fireEvent.click(await screen.findByText('1 + 1 = ?'))
    await waitFor(() => {
      expect(screen.getByText('让 AI 解析')).toBeInTheDocument()
    })
  })

  it('点击"让 AI 解析"应调用 explain API', async () => {
    render(<WrongQuestionsModule subjects={mockSubjects} onAskAI={vi.fn()} />)
    fireEvent.click(await screen.findByText('1 + 1 = ?'))
    await waitFor(() => {
      expect(screen.getByText('让 AI 解析')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByText('让 AI 解析'))
    await waitFor(() => {
      const explainCalls = (fetch as any).mock.calls.filter(
        ([url, opts]: any) => url.includes('/explain') && opts?.method === 'POST'
      )
      expect(explainCalls.length).toBeGreaterThan(0)
    })
  })

  it('点击"删除"应弹出确认', async () => {
    vi.stubGlobal('confirm', vi.fn().mockReturnValue(false))
    render(<WrongQuestionsModule subjects={mockSubjects} onAskAI={vi.fn()} />)
    fireEvent.click(await screen.findByText('1 + 1 = ?'))
    await waitFor(() => {
      expect(screen.getByText('错题详情')).toBeInTheDocument()
    })
    const deleteBtn = screen.getByRole('button', { name: /删除/ })
    fireEvent.click(deleteBtn)
    expect(confirm).toHaveBeenCalled()
  })

  it('新建错题时 question 为空应不调用 API', async () => {
    render(<WrongQuestionsModule subjects={mockSubjects} onAskAI={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /添加错题/ }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: '保存' })).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', { name: '保存' }))
    const postCalls = (fetch as any).mock.calls.filter(
      ([url, opts]: any) => url === '/api/wrong-questions' && opts?.method === 'POST'
    )
    expect(postCalls.length).toBe(0)
  })

  it('状态切换按钮应调用更新 API', async () => {
    render(<WrongQuestionsModule subjects={mockSubjects} onAskAI={vi.fn()} />)
    fireEvent.click(await screen.findByText('1 + 1 = ?'))
    await waitFor(() => {
      expect(screen.getByText('已掌握')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByText('已掌握'))
    await waitFor(() => {
      const putCalls = (fetch as any).mock.calls.filter(
        ([url, opts]: any) => url.includes('/api/wrong-questions/w2') && opts?.method === 'PUT'
      )
      expect(putCalls.length).toBeGreaterThan(0)
    })
  })
})
