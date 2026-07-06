import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const note = await db.thinkingNote.findUnique({
    where: { id },
    include: { subject: true },
  })
  if (!note) return NextResponse.json({ error: 'not found' }, { status: 404 })
  return NextResponse.json(note)
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const note = await db.thinkingNote.update({
    where: { id },
    data: {
      ...(body.title !== undefined && { title: body.title }),
      ...(body.content !== undefined && { content: body.content }),
      ...(body.question !== undefined && { question: body.question }),
      ...(body.subjectId !== undefined && { subjectId: body.subjectId || null }),
      ...(body.aiReflection !== undefined && { aiReflection: body.aiReflection }),
      ...(body.aiMode !== undefined && { aiMode: body.aiMode }),
      ...(body.status !== undefined && { status: body.status }),
      ...(body.relatedKnowledgeIds !== undefined && { relatedKnowledgeIds: body.relatedKnowledgeIds }),
    },
  })
  return NextResponse.json(note)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await db.thinkingNote.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
