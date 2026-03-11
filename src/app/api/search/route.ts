// src/app/api/search/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/session'

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession()
    const isAdmin = session.user.role === 'ADMIN'
    const userId = session.user.id

    const q = req.nextUrl.searchParams.get('q')?.trim() ?? ''
    if (q.length < 1) {
      return NextResponse.json({ clients: [], projects: [] })
    }

    const [clients, projects] = await Promise.all([
      prisma.client.findMany({
        where: {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { email: { contains: q, mode: 'insensitive' } },
          ],
        },
        select: { id: true, name: true, email: true },
        take: 5,
      }),
      prisma.project.findMany({
        where: {
          OR: [
            { title: { contains: q, mode: 'insensitive' } },
            { fileNo: { contains: q, mode: 'insensitive' } },
          ],
        },
        select: { id: true, title: true, fileNo: true, client: { select: { name: true } } },
        take: 5,
      }),
    ])

    return NextResponse.json({ clients, projects })
  } catch {
    return NextResponse.json({ clients: [], projects: [] }, { status: 401 })
  }
}
