import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const subjectId = searchParams.get('subjectId')
  const status = searchParams.get('status')
  const q = searchParams.get('q')?.trim()

  const where: any = {}
  if (subjectId) where.subjectId = subjectId
  if (status) where.status = status
  if (q) {
    where.OR = [{ title: { contains: q } }, { content: { contains: q } }, { question: { contains: q } }]
  }

  const notes = await db.thinkingNote.findMany({
    where,
    orderBy: { updatedAt: 'desc' },
    include: { subject: true },
  })
  return NextResponse.json(notes)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { title, content, question, subjectId } = body
  if (!title) return NextResponse.json({ error: 'title is required' }, { status: 400 })
  const note = await db.thinkingNote.create({
    data: {
      title,
      content: content || '',
      question: question || '',
      subjectId: subjectId || null,
      status: 'draft',
    },
  })
  return NextResponse.json(note, { status: 201 })
}
