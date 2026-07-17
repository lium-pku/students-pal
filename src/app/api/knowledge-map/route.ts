import { NextRequest, NextResponse } from 'next/server'
import { knowledgeMap } from '@/lib/knowledge-map'

// 获取地图(有缓存则返回缓存,无则生成)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const subjectId = searchParams.get('subjectId')
  if (!subjectId) {
    return NextResponse.json({ error: 'subjectId is required' }, { status: 400 })
  }
  const map = knowledgeMap.get(subjectId)
  if (!map) {
    return NextResponse.json({ error: 'subject not found' }, { status: 404 })
  }
  return NextResponse.json(map)
}

// 强制重新生成地图(刷新)
export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const subjectId = searchParams.get('subjectId')
  if (!subjectId) {
    return NextResponse.json({ error: 'subjectId is required' }, { status: 400 })
  }
  const map = knowledgeMap.generate(subjectId)
  if (!map) {
    return NextResponse.json({ error: 'subject not found' }, { status: 404 })
  }
  return NextResponse.json(map)
}
