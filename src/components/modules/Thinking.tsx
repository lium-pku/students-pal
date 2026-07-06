'use client'

import { useEffect, useState, useCallback } from 'react'
import { Subject, ThinkingNote, api } from '@/lib/types'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Plus, Pencil, Trash2, Search, Sparkles, MessageCircle, BrainCircuit, Loader2, BookOpen } from 'lucide-react'
import { toast } from 'sonner'
import { Markdown } from '@/components/Markdown'

interface ThinkingModuleProps {
  subjects: Subject[]
  onAskAI: (context: { type: string; title: string; content?: string; id: string }) => void
}

const MODES = [
  { value: 'socratic', label: '苏格拉底提问', desc: '用层层递进的问题引导你发现盲点' },
  { value: 'summarize', label: '思考镜子', desc: '复述你的核心观点，指出可深化方向' },
  { value: 'challenge', label: '理性辩手', desc: '反驳你思考中的薄弱环节' },
  { value: 'extend', label: '知识拓展员', desc: '提供跨学科的延伸思考方向' },
]

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  reflecting: 'bg-amber-100 text-amber-700',
  reflected: 'bg-emerald-100 text-emerald-700',
}

const STATUS_LABELS: Record<string, string> = {
  draft: '草稿',
  reflecting: 'AI 思考中',
  reflected: '已获引导',
}

export function ThinkingModule({ subjects, onAskAI }: ThinkingModuleProps) {
  const [notes, setNotes] = useState<ThinkingNote[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [subjectFilter, setSubjectFilter] = useState<string>('all')
  const [selected, setSelected] = useState<ThinkingNote | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState({ title: '', question: '', content: '', subjectId: '' })
  const [reflecting, setReflecting] = useState(false)
  const [mode, setMode] = useState('socratic')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (subjectFilter !== 'all') params.set('subjectId', subjectFilter)
      if (search) params.set('q', search)
      const data = await api<ThinkingNote[]>(`/api/thinking?${params.toString()}`)
      setNotes(data)
    } catch (e: any) {
      toast.error(e.message || '加载失败')
    } finally {
      setLoading(false)
    }
  }, [subjectFilter, search])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (selected) {
      const fresh = notes.find((n) => n.id === selected.id)
      if (fresh && fresh !== selected) setSelected(fresh)
    }
  }, [notes, selected])

  function openCreate() {
    setEditId(null)
    setForm({ title: '', question: '', content: '', subjectId: subjectFilter !== 'all' ? subjectFilter : '' })
    setEditorOpen(true)
  }

  function openEdit(n: ThinkingNote) {
    setEditId(n.id)
    setForm({
      title: n.title,
      question: n.question,
      content: n.content,
      subjectId: n.subjectId || '',
    })
    setEditorOpen(true)
  }

  async function save() {
    if (!form.title.trim()) {
      toast.error('请填写标题')
      return
    }
    try {
      const payload = {
        title: form.title,
        question: form.question,
        content: form.content,
        subjectId: form.subjectId || null,
      }
      if (editId) {
        await api(`/api/thinking/${editId}`, { method: 'PUT', body: JSON.stringify(payload) })
        toast.success('已更新')
      } else {
        const created = await api<ThinkingNote>('/api/thinking', { method: 'POST', body: JSON.stringify(payload) })
        toast.success('已创建')
        setEditorOpen(false)
        load()
        setSelected(created)
        return
      }
      setEditorOpen(false)
      load()
    } catch (e: any) {
      toast.error(e.message || '保存失败')
    }
  }

  async function saveContent(patch: Partial<ThinkingNote>) {
    if (!selected) return
    try {
      await api(`/api/thinking/${selected.id}`, {
        method: 'PUT',
        body: JSON.stringify(patch),
      })
      load()
    } catch (e: any) {
      toast.error(e.message || '保存失败')
    }
  }

  async function reflect() {
    if (!selected) return
    if (!selected.content.trim()) {
      toast.warning('请先写下你的思考内容')
      return
    }
    setReflecting(true)
    try {
      const res = await api<{ reflection: string }>(`/api/thinking/${selected.id}/reflect`, {
        method: 'POST',
        body: JSON.stringify({ mode }),
      })
      toast.success('AI 已给出引导')
      load()
    } catch (e: any) {
      toast.error(e.message || 'AI 反思失败')
    } finally {
      setReflecting(false)
    }
  }

  async function remove(id: string) {
    if (!confirm('确认删除这条思考笔记？')) return
    try {
      await api(`/api/thinking/${id}`, { method: 'DELETE' })
      toast.success('已删除')
      if (selected?.id === id) setSelected(null)
      load()
    } catch (e: any) {
      toast.error(e.message || '删除失败')
    }
  }

  const subjectMap = new Map(subjects.map((s) => [s.id, s]))

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">自主思考笔记</h2>
          <p className="text-sm text-muted-foreground mt-1">
            记录你独立的思考过程。AI 学伴不会直接给答案，而是用提问、复述、反驳、拓展四种方式陪你深入。
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1" />
          新建思考
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索标题或内容..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={subjectFilter} onValueChange={setSubjectFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="所有学科" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">所有学科</SelectItem>
            {subjects.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.icon} {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-32 animate-pulse bg-muted rounded-lg" />
          ))}
        </div>
      ) : notes.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-muted-foreground">
            还没有思考笔记。点击右上角"新建思考"记录你的第一个想法。
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {notes.map((n) => {
            const subj = n.subjectId ? subjectMap.get(n.subjectId) : null
            return (
              <Card
                key={n.id}
                className="cursor-pointer hover:shadow-md hover:border-primary/30 transition-all"
                onClick={() => setSelected(n)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-medium line-clamp-2 flex-1">{n.title}</h3>
                    <Badge className={STATUS_COLORS[n.status]}>
                      {STATUS_LABELS[n.status] || n.status}
                    </Badge>
                  </div>
                  {n.question && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-1 italic">
                      Q: {n.question}
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground line-clamp-3 mt-2">
                    {n.content || '（还未写下思考）'}
                  </p>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {subj && (
                        <span
                          className="px-1.5 py-0.5 rounded"
                          style={{ backgroundColor: `${subj.color}20`, color: subj.color }}
                        >
                          {subj.name}
                        </span>
                      )}
                      {n.aiReflection && (
                        <span className="flex items-center gap-0.5 text-primary">
                          <Sparkles className="h-3 w-3" />
                          有引导
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(n.updatedAt).toLocaleDateString('zh-CN')}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* 笔记详情与编辑 */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="pr-8">{selected.title}</DialogTitle>
              </DialogHeader>
              <ScrollArea className="flex-1 -mx-6 px-6">
                <div className="space-y-4 pb-2">
                  {/* 思考起点 */}
                  <div>
                    <Label className="text-xs text-muted-foreground">思考的起点 / 问题</Label>
                    <Textarea
                      value={selected.question}
                      onChange={(e) =>
                        setSelected({ ...selected, question: e.target.value })
                      }
                      onBlur={(e) => saveContent({ question: e.target.value })}
                      placeholder="写下引发你思考的问题..."
                      className="mt-1 min-h-16"
                    />
                  </div>

                  {/* 学生的思考 */}
                  <div>
                    <Label className="text-xs text-muted-foreground flex items-center gap-1">
                      <BrainCircuit className="h-3 w-3" />
                      你的思考（支持 Markdown，失焦自动保存）
                    </Label>
                    <Textarea
                      value={selected.content}
                      onChange={(e) =>
                        setSelected({ ...selected, content: e.target.value })
                      }
                      onBlur={(e) => saveContent({ content: e.target.value })}
                      placeholder="把脑中的想法写下来，不必完整，不必正确..."
                      className="mt-1 min-h-48 font-mono text-sm"
                    />
                  </div>

                  {/* AI 引导区 */}
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-primary" />
                        <span className="font-medium text-sm">AI 学伴引导</span>
                        {selected.aiReflection && (
                          <Badge variant="outline" className="text-xs">
                            {MODES.find((m) => m.value === selected.aiMode)?.label || selected.aiMode}
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="mb-3">
                      <Label className="text-xs text-muted-foreground mb-1.5 block">
                        引导模式
                      </Label>
                      <div className="grid grid-cols-2 gap-1.5">
                        {MODES.map((m) => (
                          <button
                            key={m.value}
                            onClick={() => setMode(m.value)}
                            className={`text-left p-2 rounded border text-xs transition-colors ${
                              mode === m.value
                                ? 'border-primary bg-primary/10'
                                : 'border-border hover:border-primary/30'
                            }`}
                          >
                            <div className="font-medium">{m.label}</div>
                            <div className="text-muted-foreground mt-0.5">{m.desc}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <Button
                      onClick={reflect}
                      disabled={reflecting || selected.status === 'reflecting'}
                      className="w-full"
                    >
                      {reflecting || selected.status === 'reflecting' ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                          AI 正在思考...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4 mr-1" />
                          {selected.aiReflection ? '重新让 AI 引导' : '让 AI 引导我思考'}
                        </>
                      )}
                    </Button>

                    {selected.aiReflection && (
                      <div className="mt-3 rounded-md bg-card border p-3">
                        <Markdown content={selected.aiReflection} />
                      </div>
                    )}
                  </div>
                </div>
              </ScrollArea>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() =>
                    onAskAI({
                      type: 'thinking',
                      title: selected.title,
                      content: selected.content,
                      id: selected.id,
                    })
                  }
                >
                  <MessageCircle className="h-3.5 w-3.5 mr-1" />
                  与 AI 对话
                </Button>
                <Button variant="outline" onClick={() => openEdit(selected)}>
                  <Pencil className="h-3.5 w-3.5 mr-1" />
                  重命名
                </Button>
                <Button
                  variant="outline"
                  className="text-destructive"
                  onClick={() => remove(selected.id)}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" />
                  删除
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* 编辑器（仅用于创建/重命名） */}
      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editId ? '重命名笔记' : '新建思考笔记'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>标题 *</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="mt-1"
                placeholder="例如：为什么乘法可以分配于加法？"
              />
            </div>
            {!editId && (
              <>
                <div>
                  <Label>思考的起点 / 问题</Label>
                  <Textarea
                    value={form.question}
                    onChange={(e) => setForm({ ...form, question: e.target.value })}
                    className="mt-1 min-h-16"
                    placeholder="是什么引发了你的思考？"
                  />
                </div>
                <div>
                  <Label>学科</Label>
                  <Select
                    value={form.subjectId || 'none'}
                    onValueChange={(v) => setForm({ ...form, subjectId: v === 'none' ? '' : v })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="不归属任何学科" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">不归属</SelectItem>
                      {subjects.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.icon} {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditorOpen(false)}>
              取消
            </Button>
            <Button onClick={save}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
