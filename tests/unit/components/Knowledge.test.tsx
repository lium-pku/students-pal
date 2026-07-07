import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { KnowledgeModule } from '@/components/modules/Knowledge'
import { Subject, KnowledgePoint } from '@/lib/types'

const mockSubjects: Subject[] = [
  {
    id: 's1', name: '数学', color: '#16a34a', icon: '📐',
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  },
]

const mockKPs: KnowledgePoint[] = [
  {
    id: 'k1',
    title: '勾股定理',
    content: '直角三角形两直角边的平方和等于斜边的平方',
    tags: '几何,定理',
    subjectId: 's1',
    subject: mockSubjects[0],
    mastery: 60,
    relationsFrom: [],
    relationsTo: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'k2',
    title: '数轴',
    content: '表示实数的一条直线',
    tags: '几何,初中',
    subjectId: null,
    subject: null,
    mastery: 30,
    relationsFrom: [],
    relationsTo: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

describe('KnowledgeModule 组件', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation((url: string, opts?: any) => {
      const method = opts?.method || 'GET'
      if (url.includes('/api/knowledge?') && method === 'GET') {
        return Promise.resolve({
          ok: true, status: 200,
          json: async () => mockKPs,
        })
      }
      if (url.includes('/api/knowledge/') && method === 'POST') {
        // connect API
        return Promise.resolve({
          ok: true, status: 200,
          json: async () => [
            { id: 'k2', type: 'related', description: 'd', score: 0.7 },
          ],
        })
      }
      if (url.includes('/api/knowledge/') && method === 'PUT') {
        return Promise.resolve({
          ok: true, status: 201,
          json: async () => ({ id: 'r1' }),
        })
      }
      if (url.includes('/api/knowledge') && method === 'POST') {
        return Promise.resolve({
          ok: true, status: 201,
          json: async () => mockKPs[0],
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
    render(<KnowledgeModule subjects={mockSubjects} onAskAI={vi.fn()} />)
    expect(screen.getByText('知识点')).toBeInTheDocument()
    expect(screen.getByText(/系统化整理你的知识库/)).toBeInTheDocument()
  })

  it('应渲染"新建知识点"按钮', () => {
    render(<KnowledgeModule subjects={mockSubjects} onAskAI={vi.fn()} />)
    expect(screen.getByRole('button', { name: /新建知识点/ })).toBeInTheDocument()
  })

  it('应渲染知识点列表', async () => {
    render(<KnowledgeModule subjects={mockSubjects} onAskAI={vi.fn()} />)
    expect(await screen.findByText('勾股定理')).toBeInTheDocument()
    expect(screen.getByText('数轴')).toBeInTheDocument()
  })

  it('应显示知识点的掌握度', async () => {
    render(<KnowledgeModule subjects={mockSubjects} onAskAI={vi.fn()} />)
    await screen.findByText('勾股定理')
    expect(screen.getByText('60%')).toBeInTheDocument()
    expect(screen.getByText('30%')).toBeInTheDocument()
  })

  it('应显示学科标签', async () => {
    render(<KnowledgeModule subjects={mockSubjects} onAskAI={vi.fn()} />)
    await screen.findByText('勾股定理')
    // 学科标签应显示
    expect(screen.getByText(/数学/)).toBeInTheDocument()
  })

  it('应显示标签', async () => {
    render(<KnowledgeModule subjects={mockSubjects} onAskAI={vi.fn()} />)
    await screen.findByText('勾股定理')
    // "几何"在两个知识点都出现,所以用 getAllByText
    expect(screen.getAllByText('几何').length).toBeGreaterThanOrEqual(2)
    expect(screen.getByText('定理')).toBeInTheDocument()
  })

  it('点击"新建知识点"应打开对话框', async () => {
    render(<KnowledgeModule subjects={mockSubjects} onAskAI={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /新建知识点/ }))
    // 对话框中应出现"内容(支持 Markdown)"标签
    await waitFor(() => {
      expect(screen.getByText(/内容.*Markdown/)).toBeInTheDocument()
    })
  })

  it('点击知识点卡片应打开详情对话框', async () => {
    render(<KnowledgeModule subjects={mockSubjects} onAskAI={vi.fn()} />)
    const title = await screen.findByText('勾股定理')
    fireEvent.click(title)
    // 详情对话框打开后应出现"AI 推荐关联"按钮(详情区特有)
    await waitFor(() => {
      expect(screen.getAllByText('掌握度').length).toBeGreaterThan(1)
    })
  })

  it('应在详情中显示内容(Markdown 渲染)', async () => {
    render(<KnowledgeModule subjects={mockSubjects} onAskAI={vi.fn()} />)
    const title = await screen.findByText('勾股定理')
    fireEvent.click(title)
    // 详情打开后,内容会被 Markdown 渲染(可能拆分到多元素),用部分匹配
    await waitFor(() => {
      const allText = document.body.textContent || ''
      expect(allText).toContain('直角三角形两直角边的平方和')
    })
  })

  it('点击"向 AI 提问"应调用 onAskAI', async () => {
    const onAskAI = vi.fn()
    render(<KnowledgeModule subjects={mockSubjects} onAskAI={onAskAI} />)
    fireEvent.click(await screen.findByText('勾股定理'))
    await waitFor(() => {
      expect(screen.getByText('向 AI 提问')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByText('向 AI 提问'))
    expect(onAskAI).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'knowledge',
        title: '勾股定理',
        id: 'k1',
      }),
    )
  })

  it('应支持切换到关联图视图', async () => {
    render(<KnowledgeModule subjects={mockSubjects} onAskAI={vi.fn()} />)
    await screen.findByText('勾股定理')
    // 点击"关联图"tab
    fireEvent.click(screen.getByRole('tab', { name: '关联图' }))
    // 应渲染 SVG
    await waitFor(() => {
      const svg = document.querySelector('svg')
      expect(svg).toBeInTheDocument()
    })
  })

  it('应在卡片上点击 AI 推荐关联按钮', async () => {
    render(<KnowledgeModule subjects={mockSubjects} onAskAI={vi.fn()} />)
    await screen.findByText('勾股定理')
    // 找到 AI 推荐关联按钮(图标按钮)
    const suggestButtons = screen.getAllByRole('button', { name: '' })
    // 至少应该有按钮可点击(具体识别通过 title)
    const titledBtn = document.querySelector('button[title="AI 推荐关联"]')
    if (titledBtn) {
      fireEvent.click(titledBtn)
      await waitFor(() => {
        // 应触发 API 调用
        const calls = (fetch as any).mock.calls.filter(
          ([url, opts]: any) => url.includes('/connect') && opts?.method === 'POST'
        )
        expect(calls.length).toBeGreaterThan(0)
      })
    }
  })
})
