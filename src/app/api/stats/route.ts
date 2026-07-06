import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const days = parseInt(searchParams.get('days') || '30')
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

  const [subjects, knowledgePoints, thinkingNotes, wrongQuestions, recentThinking, recentWrong, recentKnowledge] =
    await Promise.all([
      db.subject.count(),
      db.knowledgePoint.count(),
      db.thinkingNote.count(),
      db.wrongQuestion.count(),
      db.thinkingNote.findMany({
        where: { createdAt: { gte: since } },
        select: { id: true, createdAt: true },
      }),
      db.wrongQuestion.findMany({
        where: { createdAt: { gte: since } },
        select: { id: true, createdAt: true, status: true },
      }),
      db.knowledgePoint.findMany({
        where: { createdAt: { gte: since } },
        select: { id: true, createdAt: true },
      }),
    ])

  const unresolvedWrong = await db.wrongQuestion.count({ where: { status: 'unresolved' } })
  const masteredWrong = await db.wrongQuestion.count({ where: { status: 'mastered' } })
  const reviewedWrong = await db.wrongQuestion.count({ where: { status: 'reviewed' } })
  const masteryAgg = knowledgePoints > 0 ? await db.knowledgePoint.aggregate({ _avg: { mastery: true } }) : null
  const avgMastery = masteryAgg ? Math.round(masteryAgg._avg.mastery || 0) : 0

  const daily: { date: string; thinking: number; wrong: number; knowledge: number }[] = []
  for (let i = 6; i >= 0; i--) {
    const day = new Date()
    day.setHours(0, 0, 0, 0)
    day.setDate(day.getDate() - i)
    const next = new Date(day)
    next.setDate(next.getDate() + 1)
    daily.push({
      date: `${day.getMonth() + 1}/${day.getDate()}`,
      thinking: recentThinking.filter((t) => t.createdAt >= day && t.createdAt < next).length,
      wrong: recentWrong.filter((t) => t.createdAt >= day && t.createdAt < next).length,
      knowledge: recentKnowledge.filter((t) => t.createdAt >= day && t.createdAt < next).length,
    })
  }

  return NextResponse.json({
    counts: { subjects, knowledgePoints, thinkingNotes, wrongQuestions },
    wrongStats: { unresolved: unresolvedWrong, mastered: masteredWrong, reviewed: reviewedWrong },
    avgMastery,
    daily,
  })
}
