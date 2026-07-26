'use client'

import { useEffect, useState } from 'react'
import { Subject, api } from '@/lib/types'
import { Dashboard } from '@/components/modules/Dashboard'
import { SubjectsModule } from '@/components/modules/Subjects'
import { KnowledgeModule } from '@/components/modules/Knowledge'
import { ThinkingModule } from '@/components/modules/Thinking'
import { WrongQuestionsModule } from '@/components/modules/WrongQuestions'
import { KnowledgeMapModule } from '@/components/modules/KnowledgeMap'
import { AIPanel, AIContext } from '@/components/ai-panel/AIPanel'
import { Button } from '@/components/ui/button'
import {
  LayoutDashboard,
  Layers,
  BookOpen,
  BrainCircuit,
  FileQuestion,
  Sparkles,
  Menu,
  X,
  PanelRightOpen,
  Network,
} from 'lucide-react'

type Tab = 'dashboard' | 'subjects' | 'knowledge' | 'map' | 'thinking' | 'wrong'

const NAV: { id: Tab; label: string; icon: any; desc: string }[] = [
  { id: 'dashboard', label: '概览', icon: LayoutDashboard, desc: '学习仪表盘' },
  { id: 'subjects', label: '学科', icon: Layers, desc: '管理学科分类' },
  { id: 'knowledge', label: '知识点', icon: BookOpen, desc: '知识库与关联' },
  { id: 'map', label: '知识地图', icon: Network, desc: '可视化知识结构' },
  { id: 'thinking', label: '思考笔记', icon: BrainCircuit, desc: '自主思考 + AI 引导' },
  { id: 'wrong', label: '错题本', icon: FileQuestion, desc: '错题与 AI 解析' },
]

export default function Home() {
  const [tab, setTab] = useState<Tab>('dashboard')
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [aiOpen, setAiOpen] = useState(false)
  const [aiContext, setAIContext] = useState<AIContext | null>(null)

  const loadSubjects = async () => {
    try {
      const data = await api<Subject[]>('/api/subjects')
      setSubjects(data)
    } catch (e) {
      console.error('Failed to load subjects', e)
    }
  }

  useEffect(() => {
    let cancelled = false
    api<Subject[]>('/api/subjects')
      .then((data) => {
        if (!cancelled) setSubjects(data)
      })
      .catch((e) => console.error('Failed to load subjects', e))
    return () => {
      cancelled = true
    }
  }, [])

  function askAI(context: AIContext) {
    setAIContext(context)
    setAiOpen(true)
  }

  function clearContext() {
    setAIContext(null)
  }

  function navigate(t: string) {
    setTab(t as Tab)
    setSidebarOpen(false)
  }

  function showKnowledgeDetail(knowledgeId: string) {
    setTab('knowledge')
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('open-knowledge-detail', { detail: knowledgeId }))
    }, 100)
  }

  // 知识地图节点点击 → 根据类型跳转
  function showMapNodeDetail(nodeId: string, nodeType: string) {
    if (nodeType === 'knowledge') {
      showKnowledgeDetail(nodeId)
    } else if (nodeType === 'thinking') {
      setTab('thinking')
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('open-thinking-detail', { detail: nodeId }))
      }, 100)
    } else if (nodeType === 'wrong') {
      setTab('wrong')
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('open-wrong-detail', { detail: nodeId }))
      }, 100)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* 顶部 Header */}
      <header className="border-b bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60 sticky top-0 z-30">
        <div className="flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden h-9 w-9"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="切换菜单"
            >
              {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </Button>
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-primary p-1.5">
                <Sparkles className="h-4 w-4 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-base font-semibold leading-tight">学伴</h1>
                <p className="text-xs text-muted-foreground leading-tight hidden sm:block">
                  AI 学习工具
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setAiOpen(!aiOpen)}
              className="text-sm"
            >
              {aiOpen ? (
                <>
                  <X className="h-4 w-4 mr-1" />
                  <span className="hidden sm:inline">收起 AI</span>
                </>
              ) : (
                <>
                  <PanelRightOpen className="h-4 w-4 mr-1" />
                  <span className="hidden sm:inline">AI 学伴</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex">
        {/* 侧边栏(桌面: ≥1024px 常驻) */}
        <aside className="hidden lg:flex w-56 border-r bg-sidebar flex-col">
          <nav className="flex-1 p-3 space-y-1">
            {NAV.map((n) => (
              <button
                key={n.id}
                onClick={() => navigate(n.id)}
                className={`w-full flex items-start gap-3 p-2.5 rounded-lg text-left transition-colors ${
                  tab === n.id
                    ? 'bg-primary/10 text-primary'
                    : 'hover:bg-accent/50 text-sidebar-foreground'
                }`}
              >
                <n.icon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${tab === n.id ? 'text-primary' : ''}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{n.label}</div>
                  <div className="text-xs text-muted-foreground truncate">{n.desc}</div>
                </div>
              </button>
            ))}
          </nav>

          <div className="p-3 border-t">
            <div className="rounded-lg bg-gradient-to-br from-primary/10 to-accent/10 p-3">
              <div className="flex items-center gap-2 mb-1.5">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-medium">学习提示</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                先把思考写下来，再让 AI 引导你深入。AI 不会给你答案，而是陪你一起想。
              </p>
            </div>
          </div>
        </aside>

        {/* 侧边栏(平板/移动: 抽屉式, <1024px) */}
        {sidebarOpen && (
          <>
            <div
              className="lg:hidden fixed inset-0 bg-black/30 z-30"
              onClick={() => setSidebarOpen(false)}
            />
            <aside className="lg:hidden fixed left-0 top-14 bottom-0 w-64 bg-sidebar border-r z-40 flex flex-col">
              <nav className="flex-1 p-3 space-y-1">
                {NAV.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => navigate(n.id)}
                    className={`w-full flex items-start gap-3 p-3 rounded-lg text-left transition-colors ${
                      tab === n.id
                        ? 'bg-primary/10 text-primary'
                        : 'hover:bg-accent/50 text-sidebar-foreground'
                    }`}
                  >
                    <n.icon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${tab === n.id ? 'text-primary' : ''}`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{n.label}</div>
                      <div className="text-xs text-muted-foreground truncate">{n.desc}</div>
                    </div>
                  </button>
                ))}
              </nav>
            </aside>
          </>
        )}

        {/* 主内容区 */}
        <main className="flex-1 overflow-y-auto scrollbar-thin transition-all min-w-0">
          <div className="max-w-6xl mx-auto p-4 sm:p-6">
            {tab === 'dashboard' && <Dashboard subjects={subjects} onNavigate={navigate} />}
            {tab === 'subjects' && <SubjectsModule subjects={subjects} onChange={loadSubjects} />}
            {tab === 'knowledge' && <KnowledgeModule subjects={subjects} onAskAI={askAI} />}
            {tab === 'map' && <KnowledgeMapModule subjects={subjects} onNodeClick={showMapNodeDetail} />}
            {tab === 'thinking' && <ThinkingModule subjects={subjects} onAskAI={askAI} />}
            {tab === 'wrong' && <WrongQuestionsModule subjects={subjects} onAskAI={askAI} />}
          </div>
        </main>

        {/* AI 面板 */}
        {aiOpen && (
          <aside className="fixed md:static right-0 top-14 bottom-0 w-full md:w-[380px] z-20 md:z-auto">
            <AIPanel
              context={aiContext}
              onClose={() => setAiOpen(false)}
              onClearContext={clearContext}
            />
          </aside>
        )}
      </div>
    </div>
  )
}
