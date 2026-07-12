import { NextRequest, NextResponse } from 'next/server'
import { subjects } from '@/lib/vault'

// 列出所有学科
export async function GET() {
  const result = subjects.listWithCounts()
  return NextResponse.json(result)
}

// 创建学科
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { name, color, icon } = body
  if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 })
  const subject = subjects.create({ name, color, icon: icon || null })
  return NextResponse.json(subject, { status: 201 })
}
