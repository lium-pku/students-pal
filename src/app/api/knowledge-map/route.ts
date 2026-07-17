import { NextRequest, NextResponse } from 'next/server'
import { knowledgeMap } from '@/lib/knowledge-map'

export async function GET(req: NextRequest) {
  const subjectId = new URL(req.url).searchParams.get('subjectId')
  if (!subjectId) return NextResponse.json({ error: 'subjectId is required' }, { status: 400 })
  const map = knowledgeMap.get(subjectId)
  if (!map) return NextResponse.json({ error: 'subject not found' }, { status: 404 })
  return NextResponse.json(map)
}

export async function POST(req: NextRequest) {
  const subjectId = new URL(req.url).searchParams.get('subjectId')
  if (!subjectId) return NextResponse.json({ error: 'subjectId is required' }, { status: 400 })
  const map = knowledgeMap.generate(subjectId)
  if (!map) return NextResponse.json({ error: 'subject not found' }, { status: 404 })
  return NextResponse.json(map)
}
