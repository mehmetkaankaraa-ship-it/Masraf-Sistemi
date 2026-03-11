// src/actions/uploads.ts
'use server'

import { requireSession } from '@/lib/session'
import { put } from '@vercel/blob'
import { randomUUID } from 'crypto'
import path from 'path'
import type { ActionResult } from './clients'

const MAX_FILE_SIZE = 10 * 1024 * 1024
const ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/webp',
  'application/pdf',
  'text/plain',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]

export async function uploadFile(
  formData: FormData,
): Promise<ActionResult<{ storageKey: string; originalName: string; mimeType: string; sizeBytes: number; url: string }>> {
  await requireSession()

  const file = formData.get('file') as File | null
  if (!file) return { success: false, error: 'Dosya bulunamadı.' }
  if (file.size > MAX_FILE_SIZE) return { success: false, error: 'Dosya 10 MB sınırını aşıyor.' }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { success: false, error: 'Desteklenmeyen dosya türü.' }
  }

  const ext          = path.extname(file.name) || ''
  const blobPathname = `receipts/${randomUUID()}${ext}`

  // Upload to Vercel Blob — returns a permanent public URL
  const blob = await put(blobPathname, file, { access: 'public' })

  return {
    success: true,
    data: {
      storageKey:   blob.url,   // Full https:// URL stored in DB as storageKey
      originalName: file.name,
      mimeType:     file.type,
      sizeBytes:    file.size,
      url:          blob.url,
    },
  }
}
