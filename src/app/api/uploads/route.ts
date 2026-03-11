// src/app/api/uploads/route.ts
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import { requireSession } from '@/lib/session'
import { randomUUID } from 'crypto'
import path from 'path'

const MAX_BYTES     = 10 * 1024 * 1024
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']

function sanitizeFilename(name: string) {
  return name
    .replace(/[^\w.\-() ]+/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
}

export async function POST(req: Request) {
  try {
    await requireSession()

    const formData = await req.formData()
    const files = formData.getAll('files').filter(Boolean) as File[]

    if (!files.length) {
      return NextResponse.json({ error: 'Dosya bulunamadı.' }, { status: 400 })
    }

    for (const f of files) {
      if (f.size > MAX_BYTES) {
        return NextResponse.json({ error: `"${f.name}" 10 MB sınırını aşıyor.` }, { status: 400 })
      }
      if (!ALLOWED_TYPES.includes(f.type)) {
        return NextResponse.json({ error: `"${f.name}" desteklenmiyor. Yalnızca PDF, JPG veya PNG.` }, { status: 400 })
      }
    }

    const saved = []

    for (const f of files) {
      const ext          = path.extname(f.name || '')
      const base         = sanitizeFilename(path.basename(f.name || 'file', ext))
      const blobPathname = `receipts/${randomUUID()}-${base}${ext}`

      // Upload to Vercel Blob — returns a permanent public URL
      const blob = await put(blobPathname, f, { access: 'public' })

      saved.push({
        originalName: f.name,
        storageKey:   blob.url,   // Full https:// URL stored in DB as storageKey
        mimeType:     f.type || 'application/octet-stream',
        sizeBytes:    f.size,
      })
    }

    return NextResponse.json({ attachments: saved })
  } catch (e: any) {
    console.error('Upload error:', e)
    return NextResponse.json({ error: e?.message ?? 'Upload hatası' }, { status: 500 })
  }
}