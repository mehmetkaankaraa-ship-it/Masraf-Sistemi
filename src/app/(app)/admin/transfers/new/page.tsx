// src/app/(app)/admin/transfers/new/page.tsx
import { requireRole } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { listSourceAccounts } from '@/actions/advances'
import { NewTransferForm } from '@/components/admin/NewTransferForm'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default async function NewTransferPage() {
  await requireRole('ADMIN')

  const [employees, sourceAccounts] = await Promise.all([
    prisma.user.findMany({
      where:   { role: 'USER' },
      select:  { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
    listSourceAccounts(true),
  ])

  return (
    <div className="max-w-[560px] space-y-5">
      <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-3.5 w-3.5" />Geri Dön
      </Link>
      <div>
        <h1 className="text-lg font-semibold text-foreground">Avans Gönder</h1>
        <p className="text-[13px] text-muted-foreground mt-0.5">Bir çalışana avans transferi kaydı oluşturun.</p>
      </div>
      <NewTransferForm employees={employees} sourceAccounts={sourceAccounts} />
    </div>
  )
}
