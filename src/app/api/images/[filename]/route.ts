import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const IMAGES_DIR = path.join(process.cwd(), 'vault', 'images')
const MIME_MAP: Record<string, string> = {
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml',
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ filename: string }> }) {
  const { filename } = await params
  if (filename.includes('..') || filename.includes('/')) return NextResponse.json({ error: 'invalid' }, { status: 400 })
  const filepath = path.join(IMAGES_DIR, filename)
  if (!fs.existsSync(filepath)) return NextResponse.json({ error: 'not found' }, { status: 404 })
  const ext = path.extname(filename).toLowerCase()
  const buffer = fs.readFileSync(filepath)
  return new NextResponse(buffer, { headers: { 'Content-Type': MIME_MAP[ext] || 'application/octet-stream', 'Cache-Control': 'public, max-age=31536000, immutable' } })
}
