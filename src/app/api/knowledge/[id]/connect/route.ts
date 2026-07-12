import { NextRequest, NextResponse } from 'next/server'
import { knowledge } from '@/lib/vault'
import { suggestKnowledgeRelations } from '@/lib/ai'

// AI 推荐关联
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const target = knowledge.get(id)
  if (!target) return NextResponse.json({ error: 'not found' }, { status: 404 })

  const allKnowledge = knowledge.list()
  const candidates = allKnowledge.filter((k) => k.id !== id)

  const suggestions = await suggestKnowledgeRelations({
    target: {
      title: target.title,
      content: target.content,
      tags: target.tags,
    },
    candidates: candidates.map((c) => ({
      id: c.id,
      title: c.title,
      content: c.content,
      tags: c.tags,
    })),
  })

  // 去除已存在的关联
  const existingFrom = target.relationsFrom.map((r) => r.toId)
  const existingTo = target.relationsTo.map((r) => r.fromId)
  const fresh = suggestions.filter((s) => {
    return !existingFrom.includes(s.id) && !existingTo.includes(s.id)
  })

  return NextResponse.json(fresh)
}

// 手动建立关联
export async function PUT(req: NextRequest) {
  const body = await req.json()
  const { fromId, toId, type, description, aiGenerated } = body
  if (!fromId || !toId) return NextResponse.json({ error: 'fromId and toId required' }, { status: 400 })
  const rel = knowledge.addRelation({
    fromId,
    toId,
    type: type || 'related',
    description: description || '',
    aiGenerated: !!aiGenerated,
  })
  return NextResponse.json(rel, { status: 201 })
}
