'use client'

import { useEffect, useState, useCallback } from 'react'
import { Subject, WrongQuestion, KnowledgePoint, api } from '@/lib/types'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { AutoTextarea } from '@/components/AutoTextarea'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Plus, Pencil, Trash2, Search, Sparkles, FileQuestion, Loader2, MessageCircle, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { Markdown } from '@/components/Markdown'

interface WrongQuestionsModuleProps {
  subjects: Subject[]
  onAskAI: (context: { type: string; title: string; content?: string; id: string }) => void
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  unresolved: { label: '未处理', color: 'bg-rose-100 text-rose-700' },
  reviewed: { label: '已解析', color: 'bg-amber-100 text-amber-700' },
  mastered: { label: '已掌握', color: 'bg-emerald-100 text-emerald-700' },
}

const QUESTION_TYPES: Record<string, string> = {
  short: '简答',
  multiple: '选择',
  fill: '填空',
  proof: '证明',
  other: '其他',
}

export function WrongQuestionsModule({ subjects, onAskAI }: WrongQuestionsModuleProps) {
  const [items, setItems] = useState<WrongQuestion[]>([])
  const [knowledgePoints, setKnowledgePoints] = useState<KnowledgePoint[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [subjectFilter, setSubjectFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selected, setSelected] = useState<WrongQuestion | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [explaining, setExplaining] = useState(false)
  const [form, setForm] = useState({
    question: '',
    questionType: 'short',
    myAnswer: '',
    correctAnswer: '',
    analysis: '',
    subjectId: '',
    relatedKnowledgeId: '',
  })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (subjectFilter !== 'all') params.set('subjectId', subjectFilter)
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (search) params.set('q', search)
      const data = await api<WrongQuestion[]>(`/api/wrong-questions?${params.toString()}`)
      setItems(data)
    } catch (e: any) {
      toast.error(e.message || '加载失败')
    } finally {
      setLoading(false)
    }
  }, [subjectFilter, statusFilter, search])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    api<KnowledgePoint[]>('/api/knowledge?').then(setKnowledgePoints).catch(() => {})
  }, [])

  useEffect(() => {
    if (selected) {
      const fresh = items.find((i) => i.id === selected.id)
      if (fresh && fresh !== selected) setSelected(fresh)
    }
  }, [items, selected])

  function openCreate() {
    setEditId(null)
    setForm({
      question: '',
      questionType: 'short',
      myAnswer: '',
      correctAnswer: '',
      analysis: '',
      subjectId: subjectFilter !== 'all' ? subjectFilter : '',
      relatedKnowledgeId: '',
    })
    setEditorOpen(true)
  }

  function openEdit(item: WrongQuestion) {
    setEditId(item.id)
    setForm({
      question: item.question,
      questionType: item.questionType,
      myAnswer: item.myAnswer,
      correctAnswer: item.correctAnswer,
      analysis: item.analysis,
      subjectId: item.subjectId || '',
      relatedKnowledgeId: item.relatedKnowledgeId || '',
    })
    setEditorOpen(true)
  }

  async function save() {
    if (!form.question.trim()) {
      toast.error('请填写题目')
      return
    }
    try {
      const payload = {
        question: form.question,
        questionType: form.questionType,
        myAnswer: form.myAnswer,
        correctAnswer: form.correctAnswer,
        analysis: form.analysis,
        subjectId: form.subjectId || null,
        relatedKnowledgeId: form.relatedKnowledgeId || null,
      }
      if (editId) {
        await api(`/api/wrong-questions/${editId}`, { method: 'PUT', body: JSON.stringify(payload) })
        toast.success('已更新')
      } else {
        const created = await api<WrongQuestion>('/api/wrong-questions', {
          method: 'POST',
          body: JSON.stringify(payload),
        })
        toast.success('已添加错题')
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

  async function saveContent(patch: Partial<WrongQuestion>) {
    if (!selected) return
    try {
      await api(`/api/wrong-questions/${selected.id}`, {
        method: 'PUT',
        body: JSON.stringify(patch),
      })
      load()
    } catch (e: any) {
      toast.error(e.message || '保存失败')
    }
  }

  async function explain() {
    if (!selected) return
    setExplaining(true)
    try {
      const res = await api<{ explanation: string }>(`/api/wrong-questions/${selected.id}/explain`, {
        method: 'POST',
      })
      toast.success('AI 已生成解析')
      load()
    } catch (e: any) {
      toast.error(e.message || 'AI 解析失败')
    } finally {
      setExplaining(false)
    }
  }

  async function remove(id: string) {
    if (!confirm('确认删除这道错题？')) return
    try {
      await api(`/api/wrong-questions/${id}`, { method: 'DELETE' })
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
          <h2 className="text-xl font-semibold">错题本</h2>
          <p className="text-sm text-muted-foreground mt-1">
            记录每一道错题，让 AI 帮你拆解错因、回顾知识点、给出正确思路。
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1" />
          添加错题
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索题目或错因..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={subjectFilter} onValueChange={setSubjectFilter}>
          <SelectTrigger className="w-full sm:w-40">
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
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-32">
            <SelectValue placeholder="所有状态" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">所有状态</SelectItem>
            <SelectItem value="unresolved">未处理</SelectItem>
            <SelectItem value="reviewed">已解析</SelectItem>
            <SelectItem value="mastered">已掌握</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 animate-pulse bg-muted rounded-lg" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-muted-foreground">
            还没有错题。点击右上角"添加错题"记录第一道。
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {items.map((item) => {
            const subj = item.subjectId ? subjectMap.get(item.subjectId) : null
            const st = STATUS_CONFIG[item.status] || STATUS_CONFIG.unresolved
            return (
              <Card
                key={item.id}
                className="cursor-pointer hover:shadow-md hover:border-primary/30 transition-all"
                onClick={() => setSelected(item)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {QUESTION_TYPES[item.questionType] || item.questionType}
                      </Badge>
                      <Badge className={st.color}>{st.label}</Badge>
                    </div>
                    {subj && (
                      <span
                        className="text-xs px-1.5 py-0.5 rounded"
                        style={{ backgroundColor: `${subj.color}20`, color: subj.color }}
                      >
                        {subj.name}
                      </span>
                    )}
                  </div>
                  <p className="text-sm line-clamp-3">{item.question}</p>
                  <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                    <div>
                      <span className="text-muted-foreground">你的答案：</span>
                      <span className="text-rose-600 line-clamp-1">{item.myAnswer || '—'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">正确答案：</span>
                      <span className="text-emerald-600 line-clamp-1">{item.correctAnswer || '—'}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {item.aiExplanation && (
                        <span className="flex items-center gap-0.5 text-primary">
                          <Sparkles className="h-3 w-3" /> 已解析
                        </span>
                      )}
                      {item.relatedKnowledge && (
                        <span className="flex items-center gap-0.5">
                          <FileQuestion className="h-3 w-3" /> {item.relatedKnowledge.title}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(item.updatedAt).toLocaleDateString('zh-CN')}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* 错题详情 */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="w-[95vw] max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 pr-8">
                  <FileQuestion className="h-5 w-5 text-rose-500" />
                  错题详情
                </DialogTitle>
              </DialogHeader>
              <ScrollArea className="flex-1 -mx-6 px-6">
                <div className="space-y-4 pb-2">
                  <div>
                    <Label className="text-xs text-muted-foreground">题目</Label>
                    <AutoTextarea
                      value={selected.question}
                      onChange={(e) => setSelected({ ...selected, question: e.target.value })}
                      onBlur={(e) => saveContent({ question: e.target.value })}
                      className="mt-1"
                      minRows={3}
                      maxRows={10}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-muted-foreground">你的答案</Label>
                      <AutoTextarea
                        value={selected.myAnswer}
                        onChange={(e) => setSelected({ ...selected, myAnswer: e.target.value })}
                        onBlur={(e) => saveContent({ myAnswer: e.target.value })}
                        className="mt-1 text-rose-700"
                        minRows={2}
                        maxRows={6}
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">正确答案</Label>
                      <AutoTextarea
                        value={selected.correctAnswer}
                        onChange={(e) => setSelected({ ...selected, correctAnswer: e.target.value })}
                        onBlur={(e) => saveContent({ correctAnswer: e.target.value })}
                        className="mt-1 text-emerald-700"
                        minRows={2}
                        maxRows={6}
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs text-muted-foreground">你的错因分析（先自己想想）</Label>
                    <AutoTextarea
                      value={selected.analysis}
                      onChange={(e) => setSelected({ ...selected, analysis: e.target.value })}
                      onBlur={(e) => saveContent({ analysis: e.target.value })}
                      placeholder="为什么会错？是哪个概念没搞清？还是计算失误？"
                      className="mt-1"
                      minRows={3}
                      maxRows={8}
                    />
                  </div>

                  <div>
                    <Label className="text-xs text-muted-foreground">关联知识点</Label>
                    <Select
                      value={selected.relatedKnowledgeId || 'none'}
                      onValueChange={(v) => {
                        const val = v === 'none' ? null : v
                        setSelected({ ...selected, relatedKnowledgeId: val })
                        saveContent({ relatedKnowledgeId: val })
                      }}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="选择相关知识点（可选）" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">不关联</SelectItem>
                        {knowledgePoints.map((k) => (
                          <SelectItem key={k.id} value={k.id}>
                            {k.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* AI 解析区 */}
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-primary" />
                        <span className="font-medium text-sm">AI 错题解析</span>
                      </div>
                      <Button
                        size="sm"
                        onClick={explain}
                        disabled={explaining}
                      >
                        {explaining ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                            解析中...
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-3.5 w-3.5 mr-1" />
                            {selected.aiExplanation ? '重新解析' : '让 AI 解析'}
                          </>
                        )}
                      </Button>
                    </div>
                    {selected.aiExplanation ? (
                      <div className="rounded-md bg-card border p-3">
                        <Markdown content={selected.aiExplanation} />
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        点击"让 AI 解析"，AI 会回顾知识点、分析错因、给出正确思路。
                      </p>
                    )}
                  </div>

                  {/* 状态切换 */}
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-muted-foreground">掌握状态：</Label>
                    {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                      <Button
                        key={k}
                        size="sm"
                        variant={selected.status === k ? 'default' : 'outline'}
                        onClick={() => {
                          setSelected({ ...selected, status: k })
                          saveContent({ status: k })
                        }}
                      >
                        {k === 'mastered' && <CheckCircle2 className="h-3.5 w-3.5 mr-1" />}
                        {v.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </ScrollArea>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() =>
                    onAskAI({
                      type: 'wrong',
                      title: selected.question.slice(0, 80),
                      content: selected.aiExplanation,
                      id: selected.id,
                    })
                  }
                >
                  <MessageCircle className="h-3.5 w-3.5 mr-1" />
                  继续问 AI
                </Button>
                <Button variant="outline" onClick={() => openEdit(selected)}>
                  <Pencil className="h-3.5 w-3.5 mr-1" />
                  编辑
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
            <DialogTitle>{editId ? '编辑错题' : '添加错题'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>题目 *</Label>
              <AutoTextarea
                value={form.question}
                onChange={(e) => setForm({ ...form, question: e.target.value })}
                className="mt-1"
                placeholder="完整的题目内容..."
                minRows={3}
                maxRows={10}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>题型</Label>
                <Select
                  value={form.questionType}
                  onValueChange={(v) => setForm({ ...form, questionType: v })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(QUESTION_TYPES).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>学科</Label>
                <Select
                  value={form.subjectId || 'none'}
                  onValueChange={(v) => setForm({ ...form, subjectId: v === 'none' ? '' : v })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="不归属" />
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
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>你的答案</Label>
                <AutoTextarea
                  value={form.myAnswer}
                  onChange={(e) => setForm({ ...form, myAnswer: e.target.value })}
                  className="mt-1"
                  minRows={2}
                  maxRows={6}
                />
              </div>
              <div>
                <Label>正确答案</Label>
                <AutoTextarea
                  value={form.correctAnswer}
                  onChange={(e) => setForm({ ...form, correctAnswer: e.target.value })}
                  className="mt-1"
                  minRows={2}
                  maxRows={6}
                />
              </div>
            </div>
            <div>
              <Label>错因分析（可选）</Label>
              <AutoTextarea
                value={form.analysis}
                onChange={(e) => setForm({ ...form, analysis: e.target.value })}
                className="mt-1"
                placeholder="先想想自己为什么错..."
                minRows={2}
                maxRows={6}
              />
            </div>
            <div>
              <Label>关联知识点（可选）</Label>
              <Select
                value={form.relatedKnowledgeId || 'none'}
                onValueChange={(v) => setForm({ ...form, relatedKnowledgeId: v === 'none' ? '' : v })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="不关联" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">不关联</SelectItem>
                  {knowledgePoints.map((k) => (
                    <SelectItem key={k.id} value={k.id}>
                      {k.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
    </div>
  )
}
