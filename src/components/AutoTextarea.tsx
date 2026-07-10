'use client'

import { TextareaHTMLAttributes, useRef, useEffect, forwardRef } from 'react'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

interface AutoTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  minRows?: number
  maxRows?: number
}

/**
 * 自动撑高的 Textarea
 * - 内容增加时自动增高,不超过 maxRows 对应高度
 * - 内容减少时自动缩回,不低于 minRows 对应高度
 * - 适用于:思考笔记、AI 对话输入、错题编辑等需要长文本输入的场景
 */
export const AutoTextarea = forwardRef<HTMLTextAreaElement, AutoTextareaProps>(
  ({ className, minRows = 3, maxRows = 12, value, onChange, ...props }, forwardedRef) => {
    const innerRef = useRef<HTMLTextAreaElement>(null)
    const lineHeight = 24 // 与 text-sm 行高一致

    useEffect(() => {
      const el = innerRef.current
      if (!el) return
      // 先重置高度以获取正确 scrollHeight
      el.style.height = 'auto'
      const maxHeight = lineHeight * maxRows
      const minHeight = lineHeight * minRows
      const newHeight = Math.min(Math.max(el.scrollHeight, minHeight), maxHeight)
      el.style.height = `${newHeight}px`
      // 超过最大高度时启用滚动
      el.style.overflowY = el.scrollHeight > maxHeight ? 'auto' : 'hidden'
    }, [value, minRows, maxRows])

    return (
      <Textarea
        ref={(node) => {
          innerRef.current = node
          if (typeof forwardedRef === 'function') forwardedRef(node)
          else if (forwardedRef) (forwardedRef as any).current = node
        }}
        value={value}
        onChange={onChange}
        className={cn('resize-none overflow-hidden', className)}
        style={{ minHeight: lineHeight * minRows }}
        {...props}
      />
    )
  }
)

AutoTextarea.displayName = 'AutoTextarea'
