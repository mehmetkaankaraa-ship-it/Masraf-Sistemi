// src/app/api/uploads/upload/route.ts
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import { auth } from '@/lib/auth'
import { randomUUID } from 'crypto'
import path from 'path'

const MAX_FILE_SIZE = 10 * 1024 * 1024
const ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/webp',
  'application/pdf', 'text/plain',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) return NextResponse.json({ error: 'Dosya bulunamadı.' }, { status: 400 })
    if (file.size > MAX_FILE_SIZE) return NextResponse.json({ error: 'Dosya 10 MB sınırını aşıyor.' }, { status: 400 })
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Desteklenmeyen dosya türü.' }, { status: 400 })
    }

    const ext          = path.extname(file.name)
    const blobPathname = `receipts/${randomUUID()}${ext}`

    // Upload to Vercel Blob — returns a permanent public URL
    const blob = await put(blobPathname, file, { access: 'public' })

    return NextResponse.json({
      storageKey:   blob.url,   // Full https:// URL stored in DB as storageKey
      originalName: file.name,
      mimeType:     file.type,
      sizeBytes:    file.size,
      url:          blob.url,
    })
  } catch (err) {
    console.error('Upload error:', err)
    return NextResponse.json({ error: 'Yükleme başarısız.' }, { status: 500 })
  }
}
