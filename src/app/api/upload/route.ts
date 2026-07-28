import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

const IMAGES_DIR = path.join(process.cwd(), 'vault', 'images')

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'no file' }, { status: 400 })

  const allowedTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml']
  if (!allowedTypes.includes(file.type)) return NextResponse.json({ error: 'unsupported type' }, { status: 400 })

  if (!fs.existsSync(IMAGES_DIR)) fs.mkdirSync(IMAGES_DIR, { recursive: true })
  const ext = file.name.split('.').pop() || 'png'
  const filename = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())
  fs.writeFileSync(path.join(IMAGES_DIR, filename), buffer)

  return NextResponse.json({ url: `/api/images/${filename}`, filename })
}
