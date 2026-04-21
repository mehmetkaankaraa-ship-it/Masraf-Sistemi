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
  const from     = searchParams.get('from')     // e.g. "2024-03-01"
  const to       = searchParams.get('to')       // e.g. "2024-03-31"
  const userId   = searchParams.get('userId')
  const clientId = searchParams.get('clientId')

  const where: any = { type: 'EXPENSE' }

  if (!isAdmin) {
    const dbUser = await prisma.user.findUnique({
      where: { email: session.user.email! },
      select: { id: true },
    })
    if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 401 })
    where.createdById = dbUser.id
  } else if (userId) {
    where.createdById = userId
  }

  if (clientId) where.clientId = clientId

  if (from || to) {
    where.date = {}
    if (from) where.date.gte = new Date(from)
    if (to)   where.date.lte = new Date(to)
  }

  const expenses = await prisma.ledgerTransaction.findMany({
    where,
    orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    include: {
      client:     { select: { name: true } },
      project:    { select: { fileNo: true, title: true } },
      createdBy:  { select: { name: true } },
      approvedBy: { select: { name: true } },
    },
  })

  const rows = expenses.map((tx) => ({
    'Tarih':         new Date(tx.date).toLocaleDateString('tr-TR'),
    'Müvekkil':      tx.client.name,
    'Proje':         tx.project ? `${tx.project.fileNo} - ${tx.project.title}` : '',
    'Açıklama':      tx.description ?? '',
    'Kategori':      tx.category ? (categoryLabels[tx.category] ?? tx.category) : '',
    'Ödeme Yöntemi': tx.paymentMethod ?? '',
    'KDV Dahil':     tx.vatIncluded ? 'Evet' : 'Hayır',
    'KDV Oranı':     tx.vatRate ?? 0,
    'Fatura No':     tx.invoiceNo ?? '',
    'Faturalandı':   tx.invoiced ? 'Evet' : 'Hayır',
    'Tutar (TRY)':   Number(tx.amount),
    'Durum':         statusLabels[tx.status ?? 'APPROVED'] ?? tx.status ?? '',
    'Ekleyen':       tx.createdBy.name,
    'Onaylayan':     tx.approvedBy?.name ?? '',
  }))

  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Giderler')

  const colWidths = Object.keys(rows[0] ?? {}).map((key) => ({
    wch: Math.max(key.length, ...rows.map((r) => String((r as any)[key] ?? '').length)) + 2,
  }))
  ws['!cols'] = colWidths

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

  let fileSuffix = ''
  if (from && to) fileSuffix = `${from}_${to}`
  else if (from)  fileSuffix = `${from}-sonrasi`
  else if (to)    fileSuffix = `${to}-oncesi`
  const filename = fileSuffix ? `giderler-${fileSuffix}.xlsx` : 'giderler.xlsx'

  return new NextResponse(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
