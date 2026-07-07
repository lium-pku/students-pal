import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const subjectId = searchParams.get('subjectId')
  const status = searchParams.get('status')
  const q = searchParams.get('q')?.trim()

  const where: any = {}
  if (subjectId) where.subjectId = subjectId
  if (status) where.status = status
  if (q) {
    where.OR = [{ question: { contains: q } }, { analysis: { contains: q } }]
  }

  const items = await db.wrongQuestion.findMany({
    where,
    orderBy: { updatedAt: 'desc' },
    include: { subject: true, relatedKnowledge: true },
  })
  return NextResponse.json(items)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { question, questionType, options, myAnswer, correctAnswer, analysis, subjectId, relatedKnowledgeId } = body
  if (!question) return NextResponse.json({ error: 'question is required' }, { status: 400 })
  const item = await db.wrongQuestion.create({
    data: {
      question,
      questionType: questionType || 'short',
      options: typeof options === 'string' ? options : JSON.stringify(options || {}),
      myAnswer: myAnswer || '',
      correctAnswer: correctAnswer || '',
      analysis: analysis || '',
      subjectId: subjectId || null,
      relatedKnowledgeId: relatedKnowledgeId || null,
      status: 'unresolved',
    },
  })
  return NextResponse.json(item, { status: 201 })
}
