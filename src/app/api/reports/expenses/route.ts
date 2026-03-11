// src/app/api/reports/expenses/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import * as XLSX from 'xlsx'

const categoryLabels: Record<string, string> = {
  OFFICE: 'Ofis',
  TRAVEL: 'Seyahat',
  COURT_FEES: 'Mahkeme Harcı',
  SHIPPING: 'Kargo',
  NOTARY: 'Noter',
  TAX: 'Vergi',
  OTHER: 'Diğer',
}

const statusLabels: Record<string, string> = {
  DRAFT: 'Taslak',
  SUBMITTED: 'Onay Bekliyor',
  APPROVED: 'Onaylandı',
  REJECTED: 'Reddedildi',
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const isAdmin = (session.user as any).role === 'ADMIN'

  const { searchParams } = req.nextUrl
  const month = searchParams.get('month') // e.g. "2024-03"
  const userId = searchParams.get('userId') // admin can filter by user

  const where: any = { type: 'EXPENSE' }

  if (!isAdmin) {
    // Non-admins can only export their own expenses
    const dbUser = await prisma.user.findUnique({ where: { email: session.user.email! }, select: { id: true } })
    if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 401 })
    where.createdById = dbUser.id
  } else if (userId) {
    where.createdById = userId
  }

  if (month) {
    const [year, mon] = month.split('-').map(Number)
    const from = new Date(year, mon - 1, 1)
    const to = new Date(year, mon, 0) // last day of month
    where.date = { gte: from, lte: to }
  }

  const expenses = await prisma.ledgerTransaction.findMany({
    where,
    orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    include: {
      client:    { select: { name: true } },
      project:   { select: { fileNo: true, title: true } },
      createdBy: { select: { name: true } },
      approvedBy: { select: { name: true } },
    },
  })

  const rows = expenses.map((tx) => ({
    'Tarih': new Date(tx.date).toLocaleDateString('tr-TR'),
    'Müvekkil': tx.client.name,
    'Proje': tx.project ? `${tx.project.fileNo} - ${tx.project.title}` : '',
    'Açıklama': tx.description ?? '',
    'Kategori': tx.category ? (categoryLabels[tx.category] ?? tx.category) : '',
    'Ödeme Yöntemi': tx.paymentMethod ?? '',
    'KDV Dahil': tx.vatIncluded ? 'Evet' : 'Hayır',
    'KDV Oranı': tx.vatRate ?? 0,
    'Fatura No': tx.invoiceNo ?? '',
    'Faturalandı': tx.invoiced ? 'Evet' : 'Hayır',
    'Tutar (TRY)': Number(tx.amount),
    'Durum': statusLabels[tx.status ?? 'APPROVED'] ?? tx.status ?? '',
    'Ekleyen': tx.createdBy.name,
    'Onaylayan': tx.approvedBy?.name ?? '',
  }))

  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Giderler')

  // Auto column widths
  const colWidths = Object.keys(rows[0] ?? {}).map((key) => ({
    wch: Math.max(key.length, ...rows.map((r) => String((r as any)[key] ?? '').length)) + 2,
  }))
  ws['!cols'] = colWidths

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
  const filename = month ? `giderler-${month}.xlsx` : 'giderler.xlsx'

  return new NextResponse(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
