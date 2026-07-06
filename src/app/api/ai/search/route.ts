import { NextRequest, NextResponse } from 'next/server'
import { aiSearch } from '@/lib/ai'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { query, context } = body
  if (!query) return NextResponse.json({ error: 'query is required' }, { status: 400 })
  const result = await aiSearch({ query, context })
  return NextResponse.json(result)
}
