import { NextRequest, NextResponse } from 'next/server'
import { wrongQuestions } from '@/lib/vault'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const subjectId = searchParams.get('subjectId') || undefined
  const status = searchParams.get('status') || undefined
  const q = searchParams.get('q')?.trim() || undefined

  const items = wrongQuestions.list({ subjectId, status, q })
  return NextResponse.json(items)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { question, questionType, options, myAnswer, correctAnswer, analysis, subjectId, relatedKnowledgeId } = body
  if (!question) return NextResponse.json({ error: 'question is required' }, { status: 400 })
  const item = wrongQuestions.create({
    question,
    questionType: questionType || 'short',
    options: typeof options === 'string' ? options : JSON.stringify(options || {}),
    myAnswer: myAnswer || '',
    correctAnswer: correctAnswer || '',
    analysis: analysis || '',
    subjectId: subjectId || null,
    relatedKnowledgeId: relatedKnowledgeId || null,
  })
  return NextResponse.json(item, { status: 201 })
}
