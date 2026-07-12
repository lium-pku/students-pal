import { NextRequest, NextResponse } from 'next/server'
import { subjects, knowledge, thinking, wrongQuestions, chats } from '@/lib/vault'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const days = parseInt(searchParams.get('days') || '30')
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

  const subjectCount = subjects.count()
  const knowledgeCount = knowledge.count()
  const thinkingCount = thinking.count()
  const wrongCount = wrongQuestions.count()

  const recentThinking = thinking.findRecent(since)
  const recentWrong = wrongQuestions.findRecent(since)

  const unresolvedWrong = wrongQuestions.count({ status: 'unresolved' })
  const masteredWrong = wrongQuestions.count({ status: 'mastered' })
  const reviewedWrong = wrongQuestions.count({ status: 'reviewed' })

  const masteryAgg = knowledge.aggregateMastery()
  const avgMastery = masteryAgg._avg.mastery ? Math.round(masteryAgg._avg.mastery) : 0

  const daily: { date: string; thinking: number; wrong: number; knowledge: number }[] = []
  for (let i = 6; i >= 0; i--) {
    const day = new Date()
    day.setHours(0, 0, 0, 0)
    day.setDate(day.getDate() - i)
    const next = new Date(day)
    next.setDate(next.getDate() + 1)
    daily.push({
      date: `${day.getMonth() + 1}/${day.getDate()}`,
      thinking: recentThinking.filter((t) => new Date(t.createdAt) >= day && new Date(t.createdAt) < next).length,
      wrong: recentWrong.filter((t) => new Date(t.createdAt) >= day && new Date(t.createdAt) < next).length,
      knowledge: 0, // 简化:文件模型下不追踪知识点创建时间分布
    })
  }

  return NextResponse.json({
    counts: {
      subjects: subjectCount,
      knowledgePoints: knowledgeCount,
      thinkingNotes: thinkingCount,
      wrongQuestions: wrongCount,
    },
    wrongStats: {
      unresolved: unresolvedWrong,
      mastered: masteredWrong,
      reviewed: reviewedWrong,
    },
    avgMastery,
    daily,
  })
}
