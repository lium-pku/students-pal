import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { SubjectsModule } from '@/components/modules/Subjects'
import { Subject } from '@/lib/types'

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

describe('SubjectsModule 组件', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({}),
    }))
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('应渲染标题和说明', () => {
    render(<SubjectsModule subjects={mockSubjects} onChange={vi.fn()} />)
    expect(screen.getByText('学科管理')).toBeInTheDocument()
    expect(screen.getByText(/为你的学习内容归类/)).toBeInTheDocument()
  })

  it('应渲染"新建学科"按钮', () => {
    render(<SubjectsModule subjects={mockSubjects} onChange={vi.fn()} />)
    expect(screen.getByRole('button', { name: /新建学科/ })).toBeInTheDocument()
  })

  it('应渲染学科卡片', () => {
    render(<SubjectsModule subjects={mockSubjects} onChange={vi.fn()} />)
    expect(screen.getByText('数学')).toBeInTheDocument()
    expect(screen.getByText('物理')).toBeInTheDocument()
  })

  it('应在卡片上显示资源数量', () => {
    render(<SubjectsModule subjects={mockSubjects} onChange={vi.fn()} />)
    expect(screen.getByText(/知识点 5/)).toBeInTheDocument()
    expect(screen.getByText(/错题 3/)).toBeInTheDocument()
    expect(screen.getByText(/笔记 2/)).toBeInTheDocument()
  })

  it('应在无学科时显示空状态', () => {
    render(<SubjectsModule subjects={[]} onChange={vi.fn()} />)
    expect(screen.getByText(/还没有学科/)).toBeInTheDocument()
  })

  it('点击"新建学科"应打开对话框', () => {
    render(<SubjectsModule subjects={mockSubjects} onChange={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /新建学科/ }))
    expect(screen.getByText('新建学科', { selector: '[role="dialog"] *, [role="dialog"]' })).toBeInTheDocument()
  })

  it('应在对话框中显示颜色选项', () => {
    render(<SubjectsModule subjects={mockSubjects} onChange={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /新建学科/ }))
    // 颜色选项应该是 8 个圆形按钮
    const colorButtons = document.querySelectorAll('button[class*="rounded-full"]')
    expect(colorButtons.length).toBeGreaterThanOrEqual(8)
  })

  it('点击"重命名"应打开编辑对话框', () => {
    render(<SubjectsModule subjects={mockSubjects} onChange={vi.fn()} />)
    const renameButtons = screen.getAllByRole('button', { name: /重命名/ })
    fireEvent.click(renameButtons[0])
    // 对话框标题应为"重命名学科"
    expect(screen.getByText('重命名学科')).toBeInTheDocument()
  })

  it('点击"删除"应弹出确认', () => {
    vi.stubGlobal('confirm', vi.fn().mockReturnValue(false))
    render(<SubjectsModule subjects={mockSubjects} onChange={vi.fn()} />)
    const deleteButtons = screen.getAllByRole('button', { name: /删除/ })
    fireEvent.click(deleteButtons[0])
    expect(confirm).toHaveBeenCalled()
  })

  it('在确认删除时应调用 API', async () => {
    vi.stubGlobal('confirm', vi.fn().mockReturnValue(true))
    const onChange = vi.fn()
    render(<SubjectsModule subjects={mockSubjects} onChange={onChange} />)
    const deleteButtons = screen.getAllByRole('button', { name: /删除/ })
    fireEvent.click(deleteButtons[0])

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/subjects/s1'),
        expect.objectContaining({ method: 'DELETE' }),
      )
    })
    expect(onChange).toHaveBeenCalled()
  })
})
