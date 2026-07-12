import { NextRequest, NextResponse } from 'next/server'
import { knowledge } from '@/lib/vault'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const point = knowledge.get(id)
  if (!point) return NextResponse.json({ error: 'not found' }, { status: 404 })
  return NextResponse.json(point)
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  try {
    const updates: any = {}
    if (body.title !== undefined) updates.title = body.title
    if (body.content !== undefined) updates.content = body.content
    if (body.tags !== undefined) {
      updates.tags = Array.isArray(body.tags) ? body.tags : (body.tags || '').split(',').filter(Boolean)
    }
    if (body.subjectId !== undefined) updates.subjectId = body.subjectId || null
    if (body.mastery !== undefined) updates.mastery = body.mastery
    const point = knowledge.update(id, updates)
    return NextResponse.json(point)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 404 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  knowledge.delete(id)
  return NextResponse.json({ ok: true })
}
