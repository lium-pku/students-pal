import { NextRequest, NextResponse } from 'next/server'
import { thinking } from '@/lib/vault'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const subjectId = searchParams.get('subjectId') || undefined
  const status = searchParams.get('status') || undefined
  const q = searchParams.get('q')?.trim() || undefined

  const notes = thinking.list({ subjectId, status, q })
  return NextResponse.json(notes)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { title, content, question, subjectId } = body
  if (!title) return NextResponse.json({ error: 'title is required' }, { status: 400 })
  const note = thinking.create({
    title,
    content: content || '',
    question: question || '',
    subjectId: subjectId || null,
  })
  return NextResponse.json(note, { status: 201 })
}
