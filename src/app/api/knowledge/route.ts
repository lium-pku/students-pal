import { NextRequest, NextResponse } from 'next/server'
import { knowledge } from '@/lib/vault'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const subjectId = searchParams.get('subjectId') || undefined
  const q = searchParams.get('q')?.trim() || undefined

  const points = knowledge.list({ subjectId, q })
  return NextResponse.json(points)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { title, content, tags, subjectId, mastery } = body
  if (!title) return NextResponse.json({ error: 'title is required' }, { status: 400 })
  const point = knowledge.create({
    title,
    content: content || '',
    tags: Array.isArray(tags) ? tags : (tags || '').split(',').filter(Boolean),
    subjectId: subjectId || null,
    mastery: typeof mastery === 'number' ? mastery : 0,
  })
  return NextResponse.json(point, { status: 201 })
}
