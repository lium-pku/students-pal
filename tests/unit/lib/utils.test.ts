import { describe, it, expect } from 'vitest'
import { cn } from '@/lib/utils'

describe('lib/utils.ts cn', () => {
  it('应合并多个 class', () => {
    expect(cn('a', 'b', 'c')).toBe('a b c')
  })

  it('应过滤 falsy 值', () => {
    expect(cn('a', false, null, undefined, '', 0, 'b')).toBe('a b')
  })

  it('应支持条件 class', () => {
    const isActive = true
    expect(cn('base', isActive && 'active')).toBe('base active')
  })

  it('应支持对象语法', () => {
    expect(cn('base', { active: true, disabled: false })).toBe('base active')
  })

  it('应处理冲突 class(tailwind-merge)', () => {
    // 后一个 px-4 应覆盖前一个 px-2
    expect(cn('px-2', 'px-4')).toBe('px-4')
  })

  it('应处理空输入', () => {
    expect(cn()).toBe('')
  })
})
