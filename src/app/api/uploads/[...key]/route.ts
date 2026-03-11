// src/app/uploads/[...key]/route.ts
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import path from 'path'
import { promises as fs } from 'fs'

function getUploadRoot() {
  return path.resolve(process.cwd(), process.env.UPLOAD_DIR ?? './uploads')
}

export async function GET(
  _req: Request,
  { params }: { params: { key: string[] } }
) {
  try {
    // /uploads/receipts/xxx.pdf => key = ["receipts","xxx.pdf"]
    const rel = params.key.join('/')

    const uploadRoot = getUploadRoot()
    const abs = path.join(uploadRoot, rel)

    // güvenlik: uploadRoot dışına çıkmayı engelle
    if (!abs.startsWith(uploadRoot)) {
      return new NextResponse('Forbidden', { status: 403 })
    }

    const buf = await fs.readFile(abs)

    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': 'inline',
      },
    })
  } catch {
    return new NextResponse('Not found', { status: 404 })
  }
}