import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { suggestKnowledgeRelations } from '@/lib/ai'

// AI 推荐关联：基于目标知识点，从所有其他知识点中找出值得建立的关联
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const target = await db.knowledgePoint.findUnique({ where: { id } })
  if (!target) return NextResponse.json({ error: 'not found' }, { status: 404 })

  const candidates = await db.knowledgePoint.findMany({
    where: { NOT: { id } },
    take: 50,
    orderBy: { updatedAt: 'desc' },
  })

  const suggestions = await suggestKnowledgeRelations({
    target: {
      title: target.title,
      content: target.content,
      tags: target.tags ? target.tags.split(',').filter(Boolean) : [],
    },
    candidates: candidates.map((c) => ({
      id: c.id,
      title: c.title,
      content: c.content,
      tags: c.tags ? c.tags.split(',').filter(Boolean) : [],
    })),
  })

  // 去除已存在的关联
  const existing = await db.knowledgeRelation.findMany({
    where: { OR: [{ fromId: id }, { toId: id }] },
  })
  const existingKeys = new Set(existing.map((r) => `${r.fromId}->${r.toId}`))
  const fresh = suggestions.filter((s) => {
    const key = `${id}->${s.id}`
    const reverseKey = `${s.id}->${id}`
    return !existingKeys.has(key) && !existingKeys.has(reverseKey)
  })

  return NextResponse.json(fresh)
}

// 手动建立关联
export async function PUT(req: NextRequest) {
  const body = await req.json()
  const { fromId, toId, type, description, aiGenerated } = body
  if (!fromId || !toId) return NextResponse.json({ error: 'fromId and toId required' }, { status: 400 })
  const rel = await db.knowledgeRelation.create({
    data: {
      fromId,
      toId,
      type: type || 'related',
      description: description || '',
      aiGenerated: !!aiGenerated,
    },
  })
  return NextResponse.json(rel, { status: 201 })
}
