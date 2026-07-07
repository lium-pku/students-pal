import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { reflectOnThinking, ThinkingMode } from '@/lib/ai'

// 让 AI 引导思考
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const mode: ThinkingMode = (body.mode as ThinkingMode) || 'socratic'

  const note = await db.thinkingNote.findUnique({
    where: { id },
    include: { subject: true },
  })
  if (!note) return NextResponse.json({ error: 'not found' }, { status: 404 })

  // 收集相关知识点上下文
  let context = ''
  if (note.relatedKnowledgeIds) {
    const ids = note.relatedKnowledgeIds.split(',').filter(Boolean)
    if (ids.length > 0) {
      const kps = await db.knowledgePoint.findMany({ where: { id: { in: ids } } })
      context = kps.map((k) => `• ${k.title}: ${k.content.slice(0, 100)}`).join('\n')
    }
  }

  await db.thinkingNote.update({ where: { id }, data: { status: 'reflecting', aiMode: mode } })

  try {
    const reflection = await reflectOnThinking({
      question: note.question,
      content: note.content,
      mode,
      context,
    })
    const updated = await db.thinkingNote.update({
      where: { id },
      data: { aiReflection: reflection, status: 'reflected' },
    })
    return NextResponse.json({ reflection, note: updated })
  } catch (err: any) {
    await db.thinkingNote.update({ where: { id }, data: { status: 'draft' } })
    return NextResponse.json({ error: err.message || 'AI failed' }, { status: 500 })
  }
}
