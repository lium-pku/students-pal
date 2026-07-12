import { NextRequest, NextResponse } from 'next/server'
import { thinking, knowledge } from '@/lib/vault'
import { reflectOnThinking, ThinkingMode } from '@/lib/ai'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const mode: ThinkingMode = (body.mode as ThinkingMode) || 'socratic'

  const note = thinking.get(id)
  if (!note) return NextResponse.json({ error: 'not found' }, { status: 404 })

  // 收集相关知识点上下文
  let context = ''
  if (note.relatedKnowledgeIds && note.relatedKnowledgeIds.length > 0) {
    const kps = note.relatedKnowledgeIds
      .map((kid) => knowledge.get(kid))
      .filter(Boolean)
    context = kps.map((k) => `• ${k!.title}: ${k!.content.slice(0, 100)}`).join('\n')
  }

  thinking.update(id, { status: 'reflecting', aiMode: mode })

  try {
    const reflection = await reflectOnThinking({
      question: note.question,
      content: note.content,
      mode,
      context,
    })
    const updated = thinking.update(id, { aiReflection: reflection, status: 'reflected' })
    return NextResponse.json({ reflection, note: updated })
  } catch (err: any) {
    thinking.update(id, { status: 'draft' })
    return NextResponse.json({ error: err.message || 'AI failed' }, { status: 500 })
  }
}
