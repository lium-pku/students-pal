'use client'

import { useEffect, useState, useCallback } from 'react'
import { Subject, KnowledgePoint, api } from '@/lib/types'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { AutoTextarea } from '@/components/AutoTextarea'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Plus, Pencil, Trash2, Search, Sparkles, Network, Tag, ArrowRight, Bot, X } from 'lucide-react'
import { toast } from 'sonner'
import { Markdown } from '@/components/Markdown'

interface KnowledgeModuleProps {
  subjects: Subject[]
  onAskAI: (context: { type: string; title: string; content?: string; id: string }) => void
}

const RELATION_TYPES: Record<string, { label: string; color: string }> = {
  prerequisite: { label: '前置依赖', color: 'bg-rose-100 text-rose-700' },
  extension: { label: '拓展延伸', color: 'bg-emerald-100 text-emerald-700' },
  contrast: { label: '对比辨析', color: 'bg-amber-100 text-amber-700' },
  example: { label: '典型示例', color: 'bg-violet-100 text-violet-700' },
  related: { label: '一般相关', color: 'bg-sky-100 text-sky-700' },
}

export function KnowledgeModule({ subjects, onAskAI }: KnowledgeModuleProps) {
  const [points, setPoints] = useState<KnowledgePoint[]>([])
  const [loading, setLoading] = useState(true)
  const [subjectFilter, setSubjectFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [view, setView] = useState<'grid' | 'graph'>('grid')
  const [selected, setSelected] = useState<KnowledgePoint | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState({ title: '', content: '', tags: '', subjectId: '', mastery: 0 })
  const [connecting, setConnecting] = useState<KnowledgePoint | null>(null)
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [suggesting, setSuggesting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (subjectFilter !== 'all') params.set('subjectId', subjectFilter)
      if (search) params.set('q', search)
      const data = await api<KnowledgePoint[]>(`/api/knowledge?${params.toString()}`)
      setPoints(data)
    } catch (e: any) {
      toast.error(e.message || '加载失败')
    } finally {
      setLoading(false)
    }
  }, [subjectFilter, search])

  useEffect(() => {
    load()
  }, [load])

  // 当选中变化时，从列表中取最新版本
  useEffect(() => {
    if (selected) {
      const fresh = points.find((p) => p.id === selected.id)
      if (fresh && fresh !== selected) setSelected(fresh)
    }
  }, [points, selected])

  function openCreate() {
    setEditId(null)
    setForm({ title: '', content: '', tags: '', subjectId: subjectFilter !== 'all' ? subjectFilter : '', mastery: 0 })
    setEditorOpen(true)
  }

  function openEdit(p: KnowledgePoint) {
    setEditId(p.id)
    setForm({
      title: p.title,
      content: p.content,
      tags: p.tags,
      subjectId: p.subjectId || '',
      mastery: p.mastery,
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
        content: form.content,
        tags: form.tags,
        subjectId: form.subjectId || null,
        mastery: form.mastery,
      }
      if (editId) {
        await api(`/api/knowledge/${editId}`, { method: 'PUT', body: JSON.stringify(payload) })
        toast.success('已更新')
      } else {
        await api('/api/knowledge', { method: 'POST', body: JSON.stringify(payload) })
        toast.success('已创建')
      }
      setEditorOpen(false)
      load()
    } catch (e: any) {
      toast.error(e.message || '保存失败')
    }
  }

  async function remove(id: string) {
    if (!confirm('确认删除该知识点？相关的关联也会被一并删除。')) return
    try {
      await api(`/api/knowledge/${id}`, { method: 'DELETE' })
      toast.success('已删除')
      if (selected?.id === id) setSelected(null)
      load()
    } catch (e: any) {
      toast.error(e.message || '删除失败')
    }
  }

  async function suggestConnections(p: KnowledgePoint) {
    setConnecting(p)
    setSuggesting(true)
    setSuggestions([])
    try {
      const data = await api<any[]>(`/api/knowledge/${p.id}/connect`, { method: 'POST' })
      setSuggestions(data)
      if (data.length === 0) toast.info('AI 暂时没有发现新的关联建议')
    } catch (e: any) {
      toast.error(e.message || 'AI 关联建议失败')
    } finally {
      setSuggesting(false)
    }
  }

  async function acceptSuggestion(s: any) {
    if (!connecting) return
    try {
      await api(`/api/knowledge/${connecting.id}/connect`, {
        method: 'PUT',
        body: JSON.stringify({
          fromId: connecting.id,
          toId: s.id,
          type: s.type,
          description: s.description,
          aiGenerated: true,
        }),
      })
      toast.success('已建立关联')
      setSuggestions((prev) => prev.filter((x) => x.id !== s.id))
      load()
    } catch (e: any) {
      toast.error(e.message || '建立关联失败')
    }
  }

  async function removeRelation(relId: string) {
    try {
      await api(`/api/knowledge/relations/${relId}`, { method: 'DELETE' })
      toast.success('已移除关联')
      load()
    } catch (e: any) {
      toast.error(e.message || '移除失败')
    }
  }

  async function addManualRelation(toId: string, type: string, description: string) {
    if (!connecting || !toId) return
    try {
      await api(`/api/knowledge/${connecting.id}/connect`, {
        method: 'PUT',
        body: JSON.stringify({ fromId: connecting.id, toId, type, description, aiGenerated: false }),
      })
      toast.success('已建立关联')
      load()
    } catch (e: any) {
      toast.error(e.message || '建立关联失败')
    }
  }

  const subjectMap = new Map(subjects.map((s) => [s.id, s]))

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">知识点</h2>
          <p className="text-sm text-muted-foreground mt-1">
            系统化整理你的知识库。AI 可帮你发现知识点之间的隐含关联。
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1" />
          新建知识点
        </Button>
      </div>

      {/* 过滤器 */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索标题、内容或标签..."
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
        <Tabs value={view} onValueChange={(v) => setView(v as any)}>
          <TabsList className="h-10">
            <TabsTrigger value="grid" className="px-4">网格</TabsTrigger>
            <TabsTrigger value="graph" className="px-4">关联图</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-32 animate-pulse bg-muted rounded-lg" />
          ))}
        </div>
      ) : points.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-muted-foreground">
            还没有知识点。点击右上角"新建知识点"开始整理。
          </CardContent>
        </Card>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {points.map((p) => {
            const subj = p.subjectId ? subjectMap.get(p.subjectId) : null
            const tags = Array.isArray(p.tags) ? p.tags : (p.tags ? p.tags.split(',').filter(Boolean) : [])
            return (
              <Card
                key={p.id}
                className="cursor-pointer hover:shadow-md hover:border-primary/30 transition-all"
                onClick={() => setSelected(p)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-medium line-clamp-2 flex-1">{p.title}</h3>
                    {subj && (
                      <span
                        className="text-xs px-1.5 py-0.5 rounded"
                        style={{
                          backgroundColor: `${subj.color}20`,
                          color: subj.color,
                        }}
                      >
                        {subj.icon || subj.name.charAt(0)} {subj.name}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2 mt-2">
                    {p.content || '（无内容）'}
                  </p>
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {tags.slice(0, 3).map((t) => (
                        <Badge key={t} variant="secondary" className="text-xs">
                          <Tag className="h-2.5 w-2.5 mr-0.5" />
                          {t}
                        </Badge>
                      ))}
                      {tags.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{tags.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}
                  <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                    <span>掌握度</span>
                    <span>{p.mastery}%</span>
                  </div>
                  <Progress value={p.mastery} className="h-1 mt-1" />
                  <div className="flex items-center justify-between mt-3 pt-3 border-t">
                    <span className="text-xs text-muted-foreground">
                      {p.relationsFrom?.length + p.relationsTo?.length || 0} 个关联
                    </span>
                    <div className="flex gap-0.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9"
                        onClick={(e) => {
                          e.stopPropagation()
                          suggestConnections(p)
                        }}
                        title="AI 推荐关联"
                      >
                        <Sparkles className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9"
                        onClick={(e) => {
                          e.stopPropagation()
                          openEdit(p)
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-destructive"
                        onClick={(e) => {
                          e.stopPropagation()
                          remove(p.id)
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <KnowledgeGraph points={points} onSelect={(p) => setSelected(p)} />
      )}

      {/* 知识点详情 */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="w-[95vw] max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="pr-8">{selected.title}</DialogTitle>
              </DialogHeader>
              <ScrollArea className="flex-1 -mx-6 px-6">
                <div className="space-y-4">
                  {selected.subject && (
                    <Badge
                      variant="outline"
                      style={{
                        backgroundColor: `${selected.subject.color}20`,
                        color: selected.subject.color,
                        borderColor: selected.subject.color,
                      }}
                    >
                      {selected.subject.icon} {selected.subject.name}
                    </Badge>
                  )}

                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">内容</h4>
                    <div className="rounded-lg border p-3 bg-muted/30">
                      <Markdown content={selected.content || '（无内容）'} />
                    </div>
                  </div>

                  {selected.tags && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-2">标签</h4>
                      <div className="flex flex-wrap gap-1.5">
                        {(Array.isArray(selected.tags) ? selected.tags : selected.tags.split(',')).filter(Boolean).map((t) => (
                          <Badge key={t} variant="secondary">
                            <Tag className="h-2.5 w-2.5 mr-1" />
                            {t}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">掌握度</h4>
                    <div className="flex items-center gap-3">
                      <Progress value={selected.mastery} className="flex-1" />
                      <span className="text-sm font-medium">{selected.mastery}%</span>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-medium text-muted-foreground">
                        关联 ({selected.relationsFrom?.length + selected.relationsTo?.length || 0})
                      </h4>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => suggestConnections(selected)}
                      >
                        <Sparkles className="h-3.5 w-3.5 mr-1" />
                        AI 推荐关联
                      </Button>
                    </div>
                    {selected.relationsFrom?.length + selected.relationsTo?.length === 0 ? (
                      <p className="text-sm text-muted-foreground">暂无关联，点击上方按钮让 AI 帮你发现。</p>
                    ) : (
                      <div className="space-y-2">
                        {selected.relationsFrom?.map((r) => (
                          <div
                            key={r.id}
                            className="flex items-center gap-2 p-2 rounded border bg-card"
                          >
                            <Badge className={RELATION_TYPES[r.type]?.color || RELATION_TYPES.related.color}>
                              {RELATION_TYPES[r.type]?.label || r.type}
                            </Badge>
                            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                            <button
                              className="text-sm hover:text-primary hover:underline flex-1 text-left truncate"
                              onClick={() => {
                                const target = points.find((p) => p.id === r.toId)
                                if (target) setSelected(target)
                              }}
                            >
                              {r.to?.title || r.toId}
                            </button>
                            {r.aiGenerated && (
                              <Badge variant="outline" className="text-xs">
                                <Bot className="h-2.5 w-2.5 mr-0.5" /> AI
                              </Badge>
                            )}
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              onClick={() => removeRelation(r.id)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                        {selected.relationsTo?.map((r) => (
                          <div
                            key={r.id}
                            className="flex items-center gap-2 p-2 rounded border bg-card"
                          >
                            <button
                              className="text-sm hover:text-primary hover:underline flex-1 text-left truncate"
                              onClick={() => {
                                const target = points.find((p) => p.id === r.fromId)
                                if (target) setSelected(target)
                              }}
                            >
                              {r.from?.title || r.fromId}
                            </button>
                            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                            <Badge className={RELATION_TYPES[r.type]?.color || RELATION_TYPES.related.color}>
                              {RELATION_TYPES[r.type]?.label || r.type}
                            </Badge>
                            {r.aiGenerated && (
                              <Badge variant="outline" className="text-xs">
                                <Bot className="h-2.5 w-2.5 mr-0.5" /> AI
                              </Badge>
                            )}
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              onClick={() => removeRelation(r.id)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </ScrollArea>
              <DialogFooter>
                <Button variant="outline" onClick={() => openEdit(selected)}>
                  <Pencil className="h-3.5 w-3.5 mr-1" />
                  编辑
                </Button>
                <Button
                  variant="outline"
                  onClick={() =>
                    onAskAI({
                      type: 'knowledge',
                      title: selected.title,
                      content: selected.content,
                      id: selected.id,
                    })
                  }
                >
                  <Sparkles className="h-3.5 w-3.5 mr-1" />
                  向 AI 提问
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

      {/* 编辑器 */}
      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="w-[95vw] max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? '编辑知识点' : '新建知识点'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>标题 *</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="mt-1"
                placeholder="例如：勾股定理"
              />
            </div>
            <div>
              <Label>内容（支持 Markdown）</Label>
              <AutoTextarea
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                className="mt-1 font-mono text-sm"
                placeholder="详细描述这个知识点..."
                minRows={4}
                maxRows={15}
              />
            </div>
            <div>
              <Label>标签（用英文逗号分隔）</Label>
              <Input
                value={form.tags}
                onChange={(e) => setForm({ ...form, tags: e.target.value })}
                className="mt-1"
                placeholder="例如：几何, 定理, 初中"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
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
              <div>
                <Label>掌握度：{form.mastery}%</Label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={form.mastery}
                  onChange={(e) => setForm({ ...form, mastery: parseInt(e.target.value) })}
                  className="w-full mt-3"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditorOpen(false)}>
              取消
            </Button>
            <Button onClick={save}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI 关联建议 */}
      <Dialog open={!!connecting} onOpenChange={(o) => !o && setConnecting(null)}>
        <DialogContent className="w-[95vw] max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              AI 推荐关联：{connecting?.title}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="flex-1 -mx-6 px-6">
            {suggesting ? (
              <div className="space-y-2 py-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 animate-pulse bg-muted rounded" />
                ))}
                <p className="text-sm text-muted-foreground text-center mt-4">
                  AI 正在分析知识点之间的语义关联...
                </p>
              </div>
            ) : suggestions.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                暂无新的关联建议。你可以尝试手动添加关联。
                <ManualRelationAdder
                  points={points.filter((p) => p.id !== connecting?.id)}
                  onAdd={addManualRelation}
                />
              </div>
            ) : (
              <div className="space-y-2">
                {suggestions.map((s) => {
                  const target = points.find((p) => p.id === s.id)
                  if (!target) return null
                  return (
                    <div
                      key={s.id}
                      className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:border-primary/30 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className={RELATION_TYPES[s.type]?.color || RELATION_TYPES.related.color}>
                            {RELATION_TYPES[s.type]?.label || s.type}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            相关度 {Math.round((s.score || 0) * 100)}%
                          </span>
                        </div>
                        <div className="font-medium text-sm">{target.title}</div>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {s.description || target.content.slice(0, 100)}
                        </p>
                      </div>
                      <Button size="sm" onClick={() => acceptSuggestion(s)}>
                        接受
                      </Button>
                    </div>
                  )
                })}
                <div className="pt-3 border-t mt-3">
                  <p className="text-xs text-muted-foreground mb-2">没有满意的？手动添加：</p>
                  <ManualRelationAdder
                    points={points.filter((p) => p.id !== connecting?.id)}
                    onAdd={addManualRelation}
                  />
                </div>
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// 简易关联图视图
function KnowledgeGraph({ points, onSelect }: { points: KnowledgePoint[]; onSelect: (p: KnowledgePoint) => void }) {
  // 用简化的力导向布局：圆形排列
  if (points.length === 0) return null
  const radius = Math.min(280, 60 + points.length * 8)
  const cx = 320
  const cy = 280

  const nodes = points.map((p, i) => {
    const angle = (i / points.length) * Math.PI * 2
    return {
      ...p,
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
    }
  })
  const nodeMap = new Map(nodes.map((n) => [n.id, n]))

  const edges: { from: typeof nodes[0]; to: typeof nodes[0]; type: string }[] = []
  for (const p of points) {
    for (const r of p.relationsFrom || []) {
      const from = nodeMap.get(r.fromId)
      const to = nodeMap.get(r.toId)
      if (from && to) edges.push({ from, to, type: r.type })
    }
  }

  const colors: Record<string, string> = {
    prerequisite: '#dc2626',
    extension: '#16a34a',
    contrast: '#d97706',
    example: '#7c3aed',
    related: '#0891b2',
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3 text-sm text-muted-foreground">
          <Network className="h-4 w-4" />
          共 {nodes.length} 个知识点 · {edges.length} 条关联
        </div>
        <div className="w-full overflow-x-auto">
          <svg width="640" height="560" className="mx-auto" style={{ minWidth: 640 }}>
            {/* edges */}
            {edges.map((e, i) => (
              <line
                key={i}
                x1={e.from.x}
                y1={e.from.y}
                x2={e.to.x}
                y2={e.to.y}
                stroke={colors[e.type] || colors.related}
                strokeWidth={1.5}
                strokeOpacity={0.4}
              />
            ))}
            {/* nodes */}
            {nodes.map((n) => {
              const subj = n.subjectId ? null : null
              return (
                <g
                  key={n.id}
                  className="cursor-pointer"
                  onClick={() => onSelect(n)}
                >
                  <circle
                    cx={n.x}
                    cy={n.y}
                    r={18}
                    fill="hsl(var(--primary))"
                    className="hover:opacity-80 transition-opacity"
                  />
                  <text
                    x={n.x}
                    y={n.y + 32}
                    textAnchor="middle"
                    fontSize="11"
                    fill="currentColor"
                    className="pointer-events-none"
                  >
                    {n.title.length > 8 ? n.title.slice(0, 8) + '...' : n.title}
                  </text>
                </g>
              )
            })}
          </svg>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3 mt-3 text-xs">
          {Object.entries(colors).map(([k, v]) => (
            <span key={k} className="flex items-center gap-1.5">
              <span className="w-3 h-0.5" style={{ backgroundColor: v }} />
              {RELATION_TYPES[k]?.label || k}
            </span>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// 手动添加关联
function ManualRelationAdder({
  points,
  onAdd,
}: {
  points: KnowledgePoint[]
  onAdd: (toId: string, type: string, description: string) => void
}) {
  const [toId, setToId] = useState('')
  const [type, setType] = useState('related')
  const [desc, setDesc] = useState('')

  return (
    <div className="space-y-2 mt-4">
      <Select value={toId} onValueChange={setToId}>
        <SelectTrigger>
          <SelectValue placeholder="选择目标知识点" />
        </SelectTrigger>
        <SelectContent>
          {points.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.title}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="flex gap-2">
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(RELATION_TYPES).map(([k, v]) => (
              <SelectItem key={k} value={k}>
                {v.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          placeholder="关联说明（可选）"
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          className="flex-1"
        />
        <Button
          disabled={!toId}
          onClick={() => {
            onAdd(toId, type, desc)
            setToId('')
            setDesc('')
          }}
        >
          添加
        </Button>
      </div>
    </div>
  )
}
