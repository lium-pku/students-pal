import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const { name, color, icon } = body
  const subject = await db.subject.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(color !== undefined && { color }),
      ...(icon !== undefined && { icon: icon || null }),
    },
  })
  return NextResponse.json(subject)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  // 学科下的知识点/错题/思考笔记的 subjectId 会被设为 null（onDelete: SetNull）
  await db.subject.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
