import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// 获取单个会话的所有消息
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await db.chatSession.findUnique({
    where: { id },
    include: { messages: { orderBy: { createdAt: 'asc' } } },
  })
  if (!session) return NextResponse.json({ error: 'not found' }, { status: 404 })
  return NextResponse.json(session)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await db.chatSession.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
