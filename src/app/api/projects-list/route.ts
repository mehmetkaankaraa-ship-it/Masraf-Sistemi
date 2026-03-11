import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/session'

export async function GET(req: NextRequest) {
  try {
    await requireSession()
    const clientId = req.nextUrl.searchParams.get('clientId') ?? ''
    if (!clientId) return NextResponse.json({ projects: [] })
    const projects = await prisma.project.findMany({
      where: { clientId },
      select: { id: true, title: true, fileNo: true, clientId: true },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ projects })
  } catch {
    return NextResponse.json({ projects: [] }, { status: 401 })
  }
}
