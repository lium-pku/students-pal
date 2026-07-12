import { NextRequest, NextResponse } from 'next/server'
import { chats } from '@/lib/vault'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = chats.get(id)
  if (!session) return NextResponse.json({ error: 'not found' }, { status: 404 })
  return NextResponse.json(session)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  chats.delete(id)
  return NextResponse.json({ ok: true })
}
