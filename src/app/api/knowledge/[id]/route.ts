import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const point = await db.knowledgePoint.findUnique({
    where: { id },
    include: {
      subject: true,
      relationsFrom: { include: { to: true } },
      relationsTo: { include: { from: true } },
    },
  })
  if (!point) return NextResponse.json({ error: 'not found' }, { status: 404 })
  return NextResponse.json(point)
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const body = await req.json()
  const { title, content, tags, subjectId, mastery } = body
  const point = await db.knowledgePoint.update({
    where: { id },
    data: {
      ...(title !== undefined && { title }),
      ...(content !== undefined && { content }),
      ...(tags !== undefined && {
        tags: Array.isArray(tags) ? tags.join(',') : tags,
      }),
      ...(subjectId !== undefined && { subjectId: subjectId || null }),
      ...(mastery !== undefined && { mastery }),
    },
  })
  return NextResponse.json(point)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  await db.knowledgePoint.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
