import { NextRequest, NextResponse } from 'next/server'
import { knowledge } from '@/lib/vault'

// 删除关联(by fromId + toId,通过 query 参数)
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ relId: string }> }) {
  const { relId } = await params
  const { searchParams } = new URL(req.url)
  const fromId = searchParams.get('fromId')
  const toId = searchParams.get('toId')

  if (!fromId || !toId) {
    return NextResponse.json({ error: 'fromId and toId query params required' }, { status: 400 })
  }

  knowledge.removeRelationByEndpoints(fromId, toId)
  return NextResponse.json({ ok: true })
}
