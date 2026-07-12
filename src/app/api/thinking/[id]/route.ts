import { NextRequest, NextResponse } from 'next/server'
import { thinking } from '@/lib/vault'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const note = thinking.get(id)
  if (!note) return NextResponse.json({ error: 'not found' }, { status: 404 })
  return NextResponse.json(note)
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  try {
    const updates: any = {}
    if (body.title !== undefined) updates.title = body.title
    if (body.content !== undefined) updates.content = body.content
    if (body.question !== undefined) updates.question = body.question
    if (body.subjectId !== undefined) updates.subjectId = body.subjectId || null
    if (body.aiReflection !== undefined) updates.aiReflection = body.aiReflection
    if (body.aiMode !== undefined) updates.aiMode = body.aiMode
    if (body.status !== undefined) updates.status = body.status
    if (body.relatedKnowledgeIds !== undefined) updates.relatedKnowledgeIds = body.relatedKnowledgeIds
    const note = thinking.update(id, updates)
    return NextResponse.json(note)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 404 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  thinking.delete(id)
  return NextResponse.json({ ok: true })
}
