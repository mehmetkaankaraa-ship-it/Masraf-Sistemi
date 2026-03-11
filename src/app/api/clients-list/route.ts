import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/session'

export async function GET() {
  try {
    await requireSession()
    const clients = await prisma.client.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    })
    return NextResponse.json({ clients })
  } catch {
    return NextResponse.json({ clients: [] }, { status: 401 })
  }
}
