import { NextRequest, NextResponse } from 'next/server'
import { wrongQuestions, knowledge, subjects } from '@/lib/vault'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const item = wrongQuestions.get(id)
  if (!item) return NextResponse.json({ error: 'not found' }, { status: 404 })
  // 附加关联知识点
  const relatedKp = item.relatedKnowledgeId ? knowledge.get(item.relatedKnowledgeId) : null
  const subject = item.subjectId ? subjects.get(item.subjectId) : null
  return NextResponse.json({ ...item, relatedKnowledge: relatedKp, subject })
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  try {
    const updates: any = {}
    if (body.question !== undefined) updates.question = body.question
    if (body.questionType !== undefined) updates.questionType = body.questionType
    if (body.options !== undefined) {
      updates.options = typeof body.options === 'string' ? body.options : JSON.stringify(body.options || {})
    }
    if (body.myAnswer !== undefined) updates.myAnswer = body.myAnswer
    if (body.correctAnswer !== undefined) updates.correctAnswer = body.correctAnswer
    if (body.analysis !== undefined) updates.analysis = body.analysis
    if (body.aiExplanation !== undefined) updates.aiExplanation = body.aiExplanation
    if (body.status !== undefined) updates.status = body.status
    if (body.subjectId !== undefined) updates.subjectId = body.subjectId || null
    if (body.relatedKnowledgeId !== undefined) updates.relatedKnowledgeId = body.relatedKnowledgeId || null
    const item = wrongQuestions.update(id, updates)
    return NextResponse.json(item)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 404 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  wrongQuestions.delete(id)
  return NextResponse.json({ ok: true })
}
