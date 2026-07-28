'use client'

import {
  MDXEditor,
  headingsPlugin,
  listsPlugin,
  quotePlugin,
  thematicBreakPlugin,
  linkPlugin,
  linkDialogPlugin,
  tablePlugin,
  imagePlugin,
  codeBlockPlugin,
  markdownShortcutPlugin,
  toolbarPlugin,
  BoldItalicUnderlineToggles,
  UndoRedo,
  BlockTypeSelect,
  ListsToggle,
  CreateLink,
  InsertTable,
  InsertImage,
  InsertThematicBreak,
  CodeToggle,
  diffSourcePlugin,
  type MDXEditorMethods,
} from '@mdxeditor/editor'
import { useRef, useCallback } from 'react'
import '@mdxeditor/editor/style.css'

interface RichEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function RichEditor({
  value,
  onChange,
  placeholder = '请输入内容...',
  className = '',
}: RichEditorProps) {
  const editorRef = useRef<MDXEditorMethods>(null)

  const handleImageUpload = useCallback(async (file: File): Promise<string> => {
    const formData = new FormData()
    formData.append('file', file)
    const res = await fetch('/api/upload', { method: 'POST', body: formData })
    if (!res.ok) throw new Error('上传失败')
    const data = await res.json()
    return data.url
  }, [])

  const insertFormula = (syntax: string) => {
    editorRef.current?.insertMarkdown(syntax)
  }

  return (
    <div className={`rich-editor-wrapper border rounded-md overflow-hidden ${className}`}>
      <MDXEditor
        ref={editorRef}
        markdown={value || ''}
        onChange={onChange}
        placeholder={placeholder}
        plugins={[
          headingsPlugin(),
          listsPlugin(),
          quotePlugin(),
          thematicBreakPlugin(),
          linkPlugin(),
          linkDialogPlugin(),
          tablePlugin(),
          codeBlockPlugin(),
          markdownShortcutPlugin(),
          imagePlugin({ imageUploadHandler: handleImageUpload }),
          diffSourcePlugin(),
          toolbarPlugin({
            toolbarContents: () => (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px', alignItems: 'center' }}>
                <UndoRedo />
                <BlockTypeSelect />
                <BoldItalicUnderlineToggles />
                <ListsToggle />
                <CreateLink />
                <InsertTable />
                <InsertImage />
                <CodeToggle />
                <InsertThematicBreak />
                <button type="button" title="行内公式" onClick={() => insertFormula('$E=mc^2$')} style={{ padding: '2px 6px', fontSize: '14px', cursor: 'pointer', border: 'none', background: 'transparent' }}>√</button>
                <button type="button" title="求和" onClick={() => insertFormula('$$\\sum_{i=1}^{n} x_i$$')} style={{ padding: '2px 6px', fontSize: '14px', cursor: 'pointer', border: 'none', background: 'transparent' }}>∑</button>
                <button type="button" title="积分" onClick={() => insertFormula('$$\\int_0^1 x^2 dx$$')} style={{ padding: '2px 6px', fontSize: '14px', cursor: 'pointer', border: 'none', background: 'transparent' }}>∫</button>
                <button type="button" title="分式" onClick={() => insertFormula('$\\frac{a}{b}$')} style={{ padding: '2px 6px', fontSize: '14px', cursor: 'pointer', border: 'none', background: 'transparent' }}>÷</button>
                <button type="button" title="上标" onClick={() => insertFormula('$x^2$')} style={{ padding: '2px 6px', fontSize: '12px', cursor: 'pointer', border: 'none', background: 'transparent' }}>x²</button>
                <button type="button" title="下标" onClick={() => insertFormula('$x_i$')} style={{ padding: '2px 6px', fontSize: '12px', cursor: 'pointer', border: 'none', background: 'transparent' }}>xᵢ</button>
              </div>
            ),
          }),
        ]}
        contentEditableClassName="prose prose-sm max-w-none min-h-[100px] p-3 focus:outline-none"
      />
    </div>
  )
}
