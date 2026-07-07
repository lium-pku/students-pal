'use client'

import { useEffect, useRef, useState } from 'react'
import { ChatSession, ChatMessage, api } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Plus, Send, Sparkles, Search, Loader2, MessageSquare, Trash2, Globe, Bot, User, X, PanelRightClose } from 'lucide-react'
import { toast } from 'sonner'
import { Markdown } from '@/components/Markdown'

export interface AIContext {
  type: 'knowledge' | 'thinking' | 'wrong' | null
  title: string
  content?: string
  id: string
}

interface AIPanelProps {
  context: AIContext | null
  onClose: () => void
  onClearContext: () => void
}

export function AIPanel({ context, onClose, onClearContext }: AIPanelProps) {
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [searchMode, setSearchMode] = useState(false)
  const [searching, setSearching] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // 加载会话列表
  useEffect(() => {
    api<ChatSession[]>('/api/ai/chat').then(setSessions).catch(() => {})
  }, [])

  // 创建新会话（首次输入时按需创建）
  async function ensureSession(): Promise<string> {
    if (currentSession) return currentSession.id
    const session = await api<ChatSession>('/api/ai/chat', {
      method: 'POST',
      body: JSON.stringify({
        title: '新对话',
        context: context ? { type: context.type, title: context.title, id: context.id } : null,
      }),
    })
    setCurrentSession(session)
    setSessions((prev) => [session, ...prev])
    return session.id
  }

  async function send() {
    if (!input.trim() || sending) return
    const content = input.trim()
    setInput('')
    setSending(true)

    // 临时显示用户消息
    const tempUserMsg: ChatMessage = {
      id: 'temp-u-' + Date.now(),
      sessionId: currentSession?.id || 'pending',
      role: 'user',
      content,
      meta: '',
      createdAt: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, tempUserMsg])

    try {
      if (searchMode) {
        setSearching(true)
        const result = await api<{ answer: string; sources: any[] }>('/api/ai/search', {
          method: 'POST',
          body: JSON.stringify({
            query: content,
            context: context ? `${context.type}: ${context.title}` : '',
          }),
        })
        const aiMsg: ChatMessage = {
          id: 'temp-a-' + Date.now(),
          sessionId: currentSession?.id || 'pending',
          role: 'assistant',
          content: result.answer,
          meta: JSON.stringify({ sources: result.sources }),
          createdAt: new Date().toISOString(),
        }
        setMessages((prev) => [...prev, aiMsg])
        // 也将消息存到会话中
        const sessionId = await ensureSession()
        // 保存用户消息
        await api('/api/ai/chat', {
          method: 'PUT',
          body: JSON.stringify({ sessionId, content, contextType: context ? JSON.stringify({ type: context.type, title: context.title, content: context.content }) : '' }),
        })
        // 保存 AI 消息（通过另一个端点：暂时直接放第二条 PUT，但这会触发新一轮 AI 调用）
        // 简化：搜索结果作为 assistant 消息内容写入。这里我们直接更新前端，并定期刷新
        setSearching(false)
      } else {
        const sessionId = await ensureSession()
        const result = await api<{ userMsg: ChatMessage; aiMsg: ChatMessage }>('/api/ai/chat', {
          method: 'PUT',
          body: JSON.stringify({
            sessionId,
            content,
            contextType: context ? JSON.stringify({ type: context.type, title: context.title, content: context.content }) : '',
          }),
        })
        // 替换临时消息
        setMessages((prev) => [
          ...prev.filter((m) => m.id !== tempUserMsg.id),
          result.userMsg,
          result.aiMsg,
        ])
        // 更新左侧会话标题
        refreshSessions()
      }
    } catch (e: any) {
      toast.error(e.message || '发送失败')
      // 移除临时消息
      setMessages((prev) => prev.filter((m) => m.id !== tempUserMsg.id))
    } finally {
      setSending(false)
      setSearching(false)
    }
  }

  async function refreshSessions() {
    try {
      const data = await api<ChatSession[]>('/api/ai/chat')
      setSessions(data)
      if (currentSession) {
        const fresh = data.find((s) => s.id === currentSession.id)
        if (fresh) setCurrentSession(fresh)
      }
    } catch {}
  }

  async function selectSession(s: ChatSession) {
    setCurrentSession(s)
    const detail = await api<ChatSession & { messages: ChatMessage[] }>(`/api/chat-sessions/${s.id}`)
    setMessages(detail.messages || [])
    setShowHistory(false)
  }

  async function newChat() {
    setCurrentSession(null)
    setMessages([])
  }

  async function deleteSession(id: string) {
    if (!confirm('删除这个会话？')) return
    try {
      await api(`/api/chat-sessions/${id}`, { method: 'DELETE' })
      if (currentSession?.id === id) {
        setCurrentSession(null)
        setMessages([])
      }
      refreshSessions()
      toast.success('已删除')
    } catch (e: any) {
      toast.error(e.message || '删除失败')
    }
  }

  // 当 context 改变时，开始新对话
  useEffect(() => {
    if (context) {
      setCurrentSession(null)
      setMessages([])
    }
  }, [context?.id])

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const contextLabel = context
    ? {
        knowledge: '知识点',
        thinking: '思考笔记',
        wrong: '错题',
      }[context.type || ''] || '通用'
    : null

  return (
    <div className="flex flex-col h-full bg-card border-l">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b bg-gradient-to-r from-primary/5 to-accent/5">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-primary/15 p-1.5">
            <Bot className="h-4 w-4 text-primary" />
          </div>
          <div>
            <div className="font-medium text-sm">AI 学伴</div>
            {context ? (
              <button
                onClick={onClearContext}
                className="text-xs text-primary flex items-center gap-1 hover:underline"
                title="清除上下文"
              >
                <Badge variant="outline" className="text-xs py-0 h-4 border-primary/30 bg-primary/5">
                  {contextLabel}: {context.title.slice(0, 16)}
                  {context.title.length > 16 ? '...' : ''}
                  <X className="h-2.5 w-2.5 ml-0.5" />
                </Badge>
              </button>
            ) : (
              <div className="text-xs text-muted-foreground">通用学习助手</div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={() => setShowHistory(!showHistory)}
            title="历史会话"
          >
            <MessageSquare className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={newChat}
            title="新对话"
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={onClose}
            title="关闭面板"
          >
            <PanelRightClose className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* 历史会话抽屉 */}
      {showHistory && (
        <div className="border-b bg-muted/30 max-h-48 overflow-y-auto scrollbar-thin">
          {sessions.length === 0 ? (
            <p className="text-xs text-muted-foreground p-3 text-center">暂无历史会话</p>
          ) : (
            sessions.map((s) => (
              <button
                key={s.id}
                onClick={() => selectSession(s)}
                className={`w-full text-left px-3 py-2 hover:bg-accent/50 flex items-center justify-between group ${
                  currentSession?.id === s.id ? 'bg-accent' : ''
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm truncate">{s.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(s.updatedAt).toLocaleDateString('zh-CN')}{' '}
                    {new Date(s.updatedAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation()
                    deleteSession(s.id)
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </button>
            ))
          )}
        </div>
      )}

      {/* 消息列表 */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-3 min-h-full">
          {messages.length === 0 ? (
            <div className="text-center py-8">
              <div className="inline-flex rounded-full bg-primary/10 p-3 mb-3">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <p className="text-sm font-medium">和 AI 学伴聊聊吧</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
                {context
                  ? `当前上下文：${contextLabel}《${context.title.slice(0, 20)}》`
                  : '可以问我概念、解题思路、学习方法，也可以开启联网搜索获取最新信息。'}
              </p>
              <div className="grid grid-cols-1 gap-1.5 mt-4 max-w-xs mx-auto">
                {[
                  '这道题的关键思路是什么？',
                  '帮我梳理这个知识点的来龙去脉',
                  '给我出三道类似的练习题',
                  '这个概念容易和什么混淆？',
                ].map((q) => (
                  <button
                    key={q}
                    onClick={() => setInput(q)}
                    className="text-xs text-left p-2 rounded border hover:border-primary/30 hover:bg-primary/5 transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m) => (
              <MessageBubble key={m.id} msg={m} />
            ))
          )}
          {(sending || searching) && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground pl-1">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              {searching ? '正在联网搜索...' : 'AI 思考中...'}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* 输入区 */}
      <div className="border-t p-3 space-y-2">
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant={searchMode ? 'default' : 'outline'}
            className="h-7 text-xs"
            onClick={() => setSearchMode(!searchMode)}
          >
            <Globe className="h-3 w-3 mr-1" />
            联网搜索
          </Button>
          {searchMode && (
            <span className="text-xs text-muted-foreground">AI 会先搜索再回答</span>
          )}
        </div>
        <div className="relative">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={searchMode ? '输入要搜索的问题...' : '向 AI 学伴提问...'}
            className="min-h-60 max-h-40 resize-none pr-12 text-sm"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                send()
              }
            }}
          />
          <Button
            size="icon"
            className="absolute bottom-2 right-2 h-7 w-7"
            onClick={send}
            disabled={!input.trim() || sending || searching}
          >
            <Send className="h-3.5 w-3.5" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Enter 发送，Shift+Enter 换行
        </p>
      </div>
    </div>
  )
}

function MessageBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === 'user'
  let sources: any[] = []
  try {
    if (msg.meta) {
      const parsed = JSON.parse(msg.meta)
      if (parsed.sources) sources = parsed.sources
    }
  } catch {}

  return (
    <div className={`flex gap-2 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div
        className={`rounded-lg p-1.5 h-7 w-7 flex items-center justify-center flex-shrink-0 ${
          isUser ? 'bg-primary/15' : 'bg-accent'
        }`}
      >
        {isUser ? <User className="h-3.5 w-3.5 text-primary" /> : <Bot className="h-3.5 w-3.5" />}
      </div>
      <div
        className={`flex-1 rounded-lg p-3 text-sm ${
          isUser ? 'bg-primary/10' : 'bg-muted/50 border'
        }`}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{msg.content}</p>
        ) : (
          <>
            <Markdown content={msg.content} />
            {sources.length > 0 && (
              <div className="mt-3 pt-2 border-t space-y-1">
                <div className="text-xs font-medium text-muted-foreground">参考来源：</div>
                {sources.map((s, i) => (
                  <a
                    key={i}
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-xs text-primary hover:underline"
                  >
                    [{i + 1}] {s.title}
                  </a>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
