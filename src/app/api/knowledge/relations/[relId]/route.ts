import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// 删除关联
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ relId: string }> }) {
  const { relId } = await params
  await db.knowledgeRelation.delete({ where: { id: relId } })
  return NextResponse.json({ ok: true })
}
