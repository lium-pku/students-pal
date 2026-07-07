// 共享类型定义

export interface Subject {
  id: string
  name: string
  color: string
  icon: string | null
  createdAt: string
  updatedAt: string
  _count?: {
    knowledgePoints: number
    wrongQuestions: number
    thinkingNotes: number
  }
}

export interface KnowledgePoint {
  id: string
  title: string
  content: string
  tags: string
  subjectId: string | null
  subject: Subject | null
  mastery: number
  createdAt: string
  updatedAt: string
  relationsFrom: KnowledgeRelation[]
  relationsTo: KnowledgeRelation[]
}

export interface KnowledgeRelation {
  id: string
  fromId: string
  from?: KnowledgePoint
  toId: string
  to?: KnowledgePoint
  type: string
  description: string
  aiGenerated: boolean
  createdAt: string
}

export interface ThinkingNote {
  id: string
  title: string
  content: string
  question: string
  aiReflection: string
  aiMode: string
  status: string
  subjectId: string | null
  subject: Subject | null
  relatedKnowledgeIds: string
  createdAt: string
  updatedAt: string
}

export interface WrongQuestion {
  id: string
  question: string
  questionType: string
  options: string
  myAnswer: string
  correctAnswer: string
  analysis: string
  aiExplanation: string
  status: string
  subjectId: string | null
  subject: Subject | null
  relatedKnowledgeId: string | null
  relatedKnowledge: KnowledgePoint | null
  createdAt: string
  updatedAt: string
}

export interface ChatSession {
  id: string
  title: string
  context: string
  createdAt: string
  updatedAt: string
  messages?: ChatMessage[]
}

export interface ChatMessage {
  id: string
  sessionId: string
  role: string
  content: string
  meta: string
  createdAt: string
}

export interface Stats {
  counts: {
    subjects: number
    knowledgePoints: number
    thinkingNotes: number
    wrongQuestions: number
  }
  wrongStats: {
    unresolved: number
    mastered: number
    reviewed: number
  }
  avgMastery: number
  daily: { date: string; thinking: number; wrong: number; knowledge: number }[]
}

// ============ API helpers ============

export async function api<T = any>(
  url: string,
  options?: RequestInit,
): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || `HTTP ${res.status}`)
  }
  return res.json()
}
