import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { Dashboard } from '@/components/modules/Dashboard'
import { Subject, Stats } from '@/lib/types'

const mockSubjects: Subject[] = [
  {
    id: 's1', name: '数学', color: '#16a34a', icon: '📐',
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    _count: { knowledgePoints: 5, wrongQuestions: 3, thinkingNotes: 2 },
  },
  {
    id: 's2', name: '物理', color: '#dc2626', icon: '⚛️',
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    _count: { knowledgePoints: 2, wrongQuestions: 1, thinkingNotes: 1 },
  },
]

const mockStats: Stats = {
  counts: { subjects: 2, knowledgePoints: 7, thinkingNotes: 3, wrongQuestions: 4 },
  wrongStats: { unresolved: 1, mastered: 2, reviewed: 1 },
  avgMastery: 65,
  daily: [
    { date: '7/1', thinking: 1, wrong: 2, knowledge: 1 },
    { date: '7/2', thinking: 0, wrong: 1, knowledge: 0 },
    { date: '7/3', thinking: 2, wrong: 0, knowledge: 1 },
    { date: '7/4', thinking: 1, wrong: 1, knowledge: 2 },
    { date: '7/5', thinking: 0, wrong: 0, knowledge: 1 },
    { date: '7/6', thinking: 1, wrong: 2, knowledge: 0 },
    { date: '7/7', thinking: 3, wrong: 1, knowledge: 2 },
  ],
}

describe('Dashboard 组件', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockStats,
    }))
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('应渲染欢迎区', () => {
    render(<Dashboard subjects={mockSubjects} onNavigate={vi.fn()} />)
    expect(screen.getByText('今天想学点什么？')).toBeInTheDocument()
  })

  it('应渲染 4 个统计卡片标题', () => {
    render(<Dashboard subjects={mockSubjects} onNavigate={vi.fn()} />)
    expect(screen.getByText('学科')).toBeInTheDocument()
    expect(screen.getByText('知识点')).toBeInTheDocument()
    expect(screen.getByText('思考笔记')).toBeInTheDocument()
    expect(screen.getByText('错题本')).toBeInTheDocument()
  })

  it('应在加载完成后显示统计数字', async () => {
    render(<Dashboard subjects={mockSubjects} onNavigate={vi.fn()} />)
    // 等待加载完成,数字出现
    await waitFor(() => {
      const nums = screen.getAllByText('2')
      expect(nums.length).toBeGreaterThan(0)
    })
  })

  it('应在统计卡片上点击时调用 onNavigate', async () => {
    const onNavigate = vi.fn()
    render(<Dashboard subjects={mockSubjects} onNavigate={onNavigate} />)

    await waitFor(() => expect(screen.getAllByText('2').length).toBeGreaterThan(0))

    // 点击"学科"卡片(标题文本)
    fireEvent.click(screen.getByText('学科'))
    expect(onNavigate).toHaveBeenCalledWith('subjects')
  })

  it('应渲染平均掌握度', async () => {
    render(<Dashboard subjects={mockSubjects} onNavigate={vi.fn()} />)
    expect(await screen.findByText('65%')).toBeInTheDocument()
  })

  it('应渲染错题状态分布', async () => {
    render(<Dashboard subjects={mockSubjects} onNavigate={vi.fn()} />)
    expect(await screen.findByText('未处理')).toBeInTheDocument()
    expect(screen.getByText('已查看')).toBeInTheDocument()
    expect(screen.getByText('已掌握')).toBeInTheDocument()
  })

  it('应渲染学科分布列表', async () => {
    render(<Dashboard subjects={mockSubjects} onNavigate={vi.fn()} />)
    expect(await screen.findByText('数学')).toBeInTheDocument()
    expect(screen.getByText('物理')).toBeInTheDocument()
  })

  it('应在无学科时显示提示', async () => {
    render(<Dashboard subjects={[]} onNavigate={vi.fn()} />)
    expect(await screen.findByText('尚未创建学科')).toBeInTheDocument()
  })

  it('应渲染 7 日活跃度柱状图', async () => {
    render(<Dashboard subjects={mockSubjects} onNavigate={vi.fn()} />)
    expect(await screen.findByText('最近 7 天学习活跃度')).toBeInTheDocument()
    expect(screen.getByText('7/1')).toBeInTheDocument()
    expect(screen.getByText('7/7')).toBeInTheDocument()
  })

  it('应在统计数字上显示对应的值', async () => {
    render(<Dashboard subjects={mockSubjects} onNavigate={vi.fn()} />)
    await waitFor(() => expect(screen.getAllByText('2').length).toBeGreaterThan(0))
    // knowledgePoints=7 应出现(总数 7)
    expect(screen.getByText('7')).toBeInTheDocument()
  })
})
