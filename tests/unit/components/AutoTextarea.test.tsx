import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { AutoTextarea } from '@/components/AutoTextarea'

describe('AutoTextarea 组件', () => {
  it('应渲染 textarea', () => {
    render(<AutoTextarea placeholder="测试输入" />)
    expect(screen.getByPlaceholderText('测试输入')).toBeInTheDocument()
  })

  it('应显示初始值', () => {
    render(<AutoTextarea value="初始内容" onChange={() => {}} />)
    expect(screen.getByDisplayValue('初始内容')).toBeInTheDocument()
  })

  it('应调用 onChange 回调', () => {
    const onChange = vi.fn()
    render(<AutoTextarea value="" onChange={onChange} placeholder="输入" />)
    fireEvent.change(screen.getByPlaceholderText('输入'), { target: { value: '新内容' } })
    expect(onChange).toHaveBeenCalled()
  })

  it('应设置最小高度(minRows)', () => {
    const { container } = render(<AutoTextarea value="" onChange={() => {}} minRows={4} />)
    const textarea = container.querySelector('textarea')!
    // minHeight = lineHeight(24) * minRows(4) = 96
    expect(textarea.style.minHeight).toBe('96px')
  })

  it('内容增加时应自动撑高', () => {
    const { container, rerender } = render(<AutoTextarea value="短" onChange={() => {}} minRows={2} maxRows={10} />)
    const textarea = container.querySelector('textarea')!
    const initialHeight = parseInt(textarea.style.height)

    // 模拟长内容
    const longContent = '这是一段很长的内容\n'.repeat(10)
    rerender(<AutoTextarea value={longContent} onChange={() => {}} minRows={2} maxRows={10} />)

    const newHeight = parseInt(textarea.style.height)
    expect(newHeight).toBeGreaterThanOrEqual(initialHeight)
  })

  it('超过 maxRows 时应启用滚动', () => {
    const { container } = render(
      <AutoTextarea value={'长内容\n'.repeat(20)} onChange={() => {}} minRows={2} maxRows={3} />,
    )
    const textarea = container.querySelector('textarea')!
    // maxHeight = lineHeight(24) * maxRows(3) = 72
    expect(parseInt(textarea.style.height)).toBeLessThanOrEqual(72)
  })

  it('应支持自定义 className', () => {
    const { container } = render(
      <AutoTextarea value="" onChange={() => {}} className="custom-class" />,
    )
    const textarea = container.querySelector('textarea')!
    expect(textarea.className).toContain('custom-class')
  })

  it('应支持 disabled 属性', () => {
    render(<AutoTextarea value="" onChange={() => {}} disabled placeholder="禁用" />)
    expect(screen.getByPlaceholderText('禁用')).toBeDisabled()
  })

  it('应支持 placeholder', () => {
    render(<AutoTextarea value="" onChange={() => {}} placeholder="请输入思考..." />)
    expect(screen.getByPlaceholderText('请输入思考...')).toBeInTheDocument()
  })

  it('应将 resize 设为 none(防止用户手动拖拽)', () => {
    const { container } = render(<AutoTextarea value="" onChange={() => {}} />)
    const textarea = container.querySelector('textarea')!
    expect(textarea.className).toContain('resize-none')
  })
})
