import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// 列出所有学科
export async function GET() {
  const subjects = await db.subject.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: {
        select: {
          knowledgePoints: true,
          wrongQuestions: true,
          thinkingNotes: true,
        },
      },
    },
  })
  return NextResponse.json(subjects)
}

// 创建学科
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { name, color, icon } = body
  if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 })
  const subject = await db.subject.create({
    data: { name, color: color || '#16a34a', icon: icon || null },
  })
  return NextResponse.json(subject, { status: 201 })
}
