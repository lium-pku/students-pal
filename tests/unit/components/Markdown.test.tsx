import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Markdown } from '@/components/Markdown'

describe('Markdown 组件', () => {
  it('应渲染段落文本', () => {
    render(<Markdown content="这是一段文字" />)
    expect(screen.getByText('这是一段文字')).toBeInTheDocument()
  })

  it('应渲染一级标题', () => {
    render(<Markdown content="# 标题" />)
    expect(screen.getByRole('heading', { level: 1, name: '标题' })).toBeInTheDocument()
  })

  it('应渲染二级标题', () => {
    render(<Markdown content="## 子标题" />)
    expect(screen.getByRole('heading', { level: 2, name: '子标题' })).toBeInTheDocument()
  })

  it('应渲染三级标题', () => {
    render(<Markdown content="### 小标题" />)
    expect(screen.getByRole('heading', { level: 3, name: '小标题' })).toBeInTheDocument()
  })

  it('应渲染无序列表', () => {
    render(<Markdown content={'- 项目一\n- 项目二\n- 项目三'} />)
    expect(screen.getByText('项目一')).toBeInTheDocument()
    expect(screen.getByText('项目二')).toBeInTheDocument()
    expect(screen.getByText('项目三')).toBeInTheDocument()
  })

  it('应渲染有序列表', () => {
    render(<Markdown content={'1. 步骤一\n2. 步骤二'} />)
    expect(screen.getByText('步骤一')).toBeInTheDocument()
    expect(screen.getByText('步骤二')).toBeInTheDocument()
  })

  it('应渲染代码块', () => {
    render(<Markdown content={'```\nconst x = 1\n```'} />)
    expect(screen.getByText(/const x = 1/)).toBeInTheDocument()
  })

  it('应渲染行内代码', () => {
    render(<Markdown content="使用 `code` 关键字" />)
    expect(screen.getByText('code')).toBeInTheDocument()
  })

  it('应渲染引用块', () => {
    render(<Markdown content="> 这是引用" />)
    expect(screen.getByText('这是引用')).toBeInTheDocument()
  })

  it('应渲染加粗文本', () => {
    render(<Markdown content="这是 **加粗** 文本" />)
    expect(screen.getByText('加粗')).toBeInTheDocument()
  })

  it('应渲染链接并设置 target=_blank', () => {
    render(<Markdown content="[Z.ai](https://z.ai)" />)
    const link = screen.getByRole('link', { name: 'Z.ai' })
    expect(link).toHaveAttribute('href', 'https://z.ai')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('应在内容为空时不渲染任何内容', () => {
    const { container } = render(<Markdown content="" />)
    expect(container.firstChild).toBeNull()
  })

  it('应支持自定义 className', () => {
    const { container } = render(<Markdown content="X" className="custom-class" />)
    expect(container.firstChild).toHaveClass('markdown-body', 'custom-class')
  })
})
