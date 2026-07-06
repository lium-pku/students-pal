import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// 列出知识点（可按 subjectId 过滤）
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const subjectId = searchParams.get('subjectId')
  const q = searchParams.get('q')?.trim()

  const where: any = {}
  if (subjectId) where.subjectId = subjectId
  if (q) {
    where.OR = [
      { title: { contains: q } },
      { content: { contains: q } },
      { tags: { contains: q } },
    ]
  }

  const points = await db.knowledgePoint.findMany({
    where,
    orderBy: { updatedAt: 'desc' },
    include: {
      subject: true,
      relationsFrom: { include: { to: true } },
      relationsTo: { include: { from: true } },
    },
  })
  return NextResponse.json(points)
}

// 创建知识点
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { title, content, tags, subjectId, mastery } = body
  if (!title) return NextResponse.json({ error: 'title is required' }, { status: 400 })
  const point = await db.knowledgePoint.create({
    data: {
      title,
      content: content || '',
      tags: Array.isArray(tags) ? tags.join(',') : tags || '',
      subjectId: subjectId || null,
      mastery: typeof mastery === 'number' ? mastery : 0,
    },
  })
  return NextResponse.json(point, { status: 201 })
}
