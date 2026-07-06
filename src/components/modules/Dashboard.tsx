'use client'

import { useEffect, useState } from 'react'
import { api, Stats, Subject } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { BookOpen, BrainCircuit, FileQuestion, Layers, Sparkles, TrendingUp } from 'lucide-react'

interface DashboardProps {
  subjects: Subject[]
  onNavigate: (tab: string) => void
}

export function Dashboard({ subjects, onNavigate }: DashboardProps) {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api<Stats>('/api/stats')
      .then(setStats)
      .finally(() => setLoading(false))
  }, [])

  const cards = [
    {
      label: '学科',
      value: stats?.counts.subjects ?? 0,
      icon: Layers,
      color: 'text-emerald-600 bg-emerald-50',
      tab: 'subjects',
    },
    {
      label: '知识点',
      value: stats?.counts.knowledgePoints ?? 0,
      icon: BookOpen,
      color: 'text-amber-600 bg-amber-50',
      tab: 'knowledge',
    },
    {
      label: '思考笔记',
      value: stats?.counts.thinkingNotes ?? 0,
      icon: BrainCircuit,
      color: 'text-rose-600 bg-rose-50',
      tab: 'thinking',
    },
    {
      label: '错题本',
      value: stats?.counts.wrongQuestions ?? 0,
      icon: FileQuestion,
      color: 'text-violet-600 bg-violet-50',
      tab: 'wrong',
    },
  ]

  return (
    <div className="space-y-6">
      {/* 欢迎区 */}
      <div className="rounded-xl bg-gradient-to-br from-primary/10 via-primary/5 to-accent/10 p-6 border border-primary/10">
        <div className="flex items-start gap-4">
          <div className="rounded-lg bg-primary/15 p-3">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-semibold">今天想学点什么？</h2>
            <p className="text-muted-foreground mt-1">
              写下你的思考、整理知识点、记录错题，需要时让 AI 学伴陪你一起探索。
            </p>
          </div>
        </div>
      </div>

      {/* 概览卡片 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <button
            key={c.label}
            onClick={() => onNavigate(c.tab)}
            className="text-left"
          >
            <Card className="hover:shadow-md hover:border-primary/30 transition-all h-full">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div className={`rounded-lg p-2 ${c.color}`}>
                    <c.icon className="h-5 w-5" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-3xl font-semibold">
                    {loading ? '—' : c.value}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">{c.label}</div>
                </div>
              </CardContent>
            </Card>
          </button>
        ))}
      </div>

      {/* 学习状态概览 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              知识点平均掌握度
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">
              {loading ? '—' : `${stats?.avgMastery ?? 0}%`}
            </div>
            <Progress value={stats?.avgMastery ?? 0} className="mt-3" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <FileQuestion className="h-4 w-4 text-rose-500" />
              错题状态分布
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">未处理</span>
              <Badge variant="destructive">{stats?.wrongStats.unresolved ?? 0}</Badge>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">已查看</span>
              <Badge variant="secondary">{stats?.wrongStats.reviewed ?? 0}</Badge>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">已掌握</span>
              <Badge className="bg-emerald-100 text-emerald-700">{stats?.wrongStats.mastered ?? 0}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Layers className="h-4 w-4 text-amber-600" />
              学科分布
            </CardTitle>
          </CardHeader>
          <CardContent>
            {subjects.length === 0 ? (
              <p className="text-sm text-muted-foreground">尚未创建学科</p>
            ) : (
              <div className="space-y-2 max-h-32 overflow-y-auto scrollbar-thin">
                {subjects.map((s) => (
                  <div key={s.id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: s.color }}
                      />
                      <span>{s.name}</span>
                    </div>
                    <span className="text-muted-foreground">
                      {(s._count?.knowledgePoints ?? 0) + (s._count?.wrongQuestions ?? 0) + (s._count?.thinkingNotes ?? 0)} 项
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 近 7 日活跃 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">最近 7 天学习活跃度</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-32 animate-pulse bg-muted rounded" />
          ) : (
            <div className="flex items-end justify-between gap-2 h-32">
              {stats?.daily.map((d) => {
                const max = Math.max(
                  1,
                  ...stats.daily.map((x) => x.thinking + x.wrong + x.knowledge),
                )
                const total = d.thinking + d.wrong + d.knowledge
                const heightPct = (total / max) * 100
                return (
                  <div key={d.date} className="flex-1 flex flex-col items-center gap-1.5">
                    <div className="text-xs text-muted-foreground">{total || ''}</div>
                    <div
                      className="w-full rounded-t-md bg-gradient-to-t from-primary/40 to-primary transition-all hover:from-primary hover:to-primary"
                      style={{ height: `${Math.max(heightPct, 4)}%` }}
                      title={`思考笔记 ${d.thinking} · 错题 ${d.wrong} · 知识点 ${d.knowledge}`}
                    />
                    <div className="text-xs text-muted-foreground">{d.date}</div>
                  </div>
                )
              })}
            </div>
          )}
          <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-sm bg-primary" /> 学习记录
            </span>
            <span>统计周期：最近 30 天</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
