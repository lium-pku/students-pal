import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const item = await db.wrongQuestion.findUnique({
    where: { id },
    include: { subject: true, relatedKnowledge: true },
  })
  if (!item) return NextResponse.json({ error: 'not found' }, { status: 404 })
  return NextResponse.json(item)
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const item = await db.wrongQuestion.update({
    where: { id },
    data: {
      ...(body.question !== undefined && { question: body.question }),
      ...(body.questionType !== undefined && { questionType: body.questionType }),
      ...(body.options !== undefined && {
        options: typeof body.options === 'string' ? body.options : JSON.stringify(body.options || {}),
      }),
      ...(body.myAnswer !== undefined && { myAnswer: body.myAnswer }),
      ...(body.correctAnswer !== undefined && { correctAnswer: body.correctAnswer }),
      ...(body.analysis !== undefined && { analysis: body.analysis }),
      ...(body.aiExplanation !== undefined && { aiExplanation: body.aiExplanation }),
      ...(body.status !== undefined && { status: body.status }),
      ...(body.subjectId !== undefined && { subjectId: body.subjectId || null }),
      ...(body.relatedKnowledgeId !== undefined && { relatedKnowledgeId: body.relatedKnowledgeId || null }),
    },
  })
  return NextResponse.json(item)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await db.wrongQuestion.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
