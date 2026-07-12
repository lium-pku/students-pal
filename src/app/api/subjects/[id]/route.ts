import { NextRequest, NextResponse } from 'next/server'
import { subjects } from '@/lib/vault'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const { name, color, icon } = body
  try {
    const subject = subjects.update(id, { name, color, icon })
    return NextResponse.json(subject)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 404 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  subjects.delete(id)
  return NextResponse.json({ ok: true })
}
