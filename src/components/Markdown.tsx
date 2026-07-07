'use client'

import ReactMarkdown from 'react-markdown'

export function Markdown({ content, className }: { content: string; className?: string }) {
  if (!content) return null
  return (
    <div className={`markdown-body ${className || ''}`}>
      <ReactMarkdown
        components={{
          a: ({ node, ...props }) => (
            <a {...props} target="_blank" rel="noopener noreferrer" />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
