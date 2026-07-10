'use client'

import { useState } from 'react'
import { Subject, api } from '@/lib/types'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Plus, Pencil, Trash2, BookOpen, FileQuestion, BrainCircuit } from 'lucide-react'
import { toast } from 'sonner'

interface SubjectsModuleProps {
  subjects: Subject[]
  onChange: () => void
}

const COLOR_OPTIONS = [
  '#16a34a', '#d97706', '#dc2626', '#7c3aed',
  '#0891b2', '#db2777', '#65a30d', '#ea580c',
]

export function SubjectsModule({ subjects, onChange }: SubjectsModuleProps) {
  const [open, setOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [color, setColor] = useState(COLOR_OPTIONS[0])
  const [icon, setIcon] = useState('')

  function reset() {
    setEditId(null)
    setName('')
    setColor(COLOR_OPTIONS[0])
    setIcon('')
  }

  function openCreate() {
    reset()
    setOpen(true)
  }

  function openEdit(s: Subject) {
    setEditId(s.id)
    setName(s.name)
    setColor(s.color)
    setIcon(s.icon || '')
    setOpen(true)
  }

  async function save() {
    if (!name.trim()) {
      toast.error('请填写学科名称')
      return
    }
    try {
      if (editId) {
        await api(`/api/subjects/${editId}`, {
          method: 'PUT',
          body: JSON.stringify({ name, color, icon }),
        })
        toast.success('已更新学科')
      } else {
        await api('/api/subjects', {
          method: 'POST',
          body: JSON.stringify({ name, color, icon }),
        })
        toast.success('已创建学科')
      }
      setOpen(false)
      reset()
      onChange()
    } catch (e: any) {
      toast.error(e.message || '保存失败')
    }
  }

  async function remove(id: string) {
    if (!confirm('删除学科后，其下知识点/错题的学科归属将变为空。确认删除？')) return
    try {
      await api(`/api/subjects/${id}`, { method: 'DELETE' })
      toast.success('已删除')
      onChange()
    } catch (e: any) {
      toast.error(e.message || '删除失败')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">学科管理</h2>
          <p className="text-sm text-muted-foreground mt-1">
            为你的学习内容归类，每个学科可有独立的颜色标识。
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1" />
          新建学科
        </Button>
      </div>

      {subjects.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-muted-foreground">
            还没有学科。点击右上角"新建学科"开始。
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {subjects.map((s) => (
            <Card key={s.id} className="overflow-hidden hover:shadow-md transition-shadow">
              <div className="h-1.5" style={{ backgroundColor: s.color }} />
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="rounded-lg p-2.5 text-white"
                      style={{ backgroundColor: s.color }}
                    >
                      <span className="text-lg">{s.icon || s.name.charAt(0)}</span>
                    </div>
                    <div>
                      <div className="font-medium">{s.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {s._count?.knowledgePoints ?? 0} 知识点 · {s._count?.wrongQuestions ?? 0} 错题 · {s._count?.thinkingNotes ?? 0} 笔记
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <BookOpen className="h-3.5 w-3.5" />
                    知识点 {s._count?.knowledgePoints ?? 0}
                  </div>
                  <div className="flex items-center gap-1">
                    <FileQuestion className="h-3.5 w-3.5" />
                    错题 {s._count?.wrongQuestions ?? 0}
                  </div>
                  <div className="flex items-center gap-1">
                    <BrainCircuit className="h-3.5 w-3.5" />
                    笔记 {s._count?.thinkingNotes ?? 0}
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEdit(s)}
                  >
                    <Pencil className="h-3.5 w-3.5 mr-1" />
                    重命名
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => remove(s.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" />
                    删除
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[95vw] max-w-md">
          <DialogHeader>
            <DialogTitle>{editId ? '重命名学科' : '新建学科'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>学科名称</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例如：数学、英语、物理"
                className="mt-1"
              />
            </div>
            <div>
              <Label>颜色标识</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {COLOR_OPTIONS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className={`w-8 h-8 rounded-full transition-all ${
                      color === c ? 'ring-2 ring-offset-2 ring-foreground' : ''
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
            <div>
              <Label>图标 Emoji（可选）</Label>
              <Input
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                placeholder="例如：📐 📚 ⚛️"
                className="mt-1"
                maxLength={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              取消
            </Button>
            <Button onClick={save}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
