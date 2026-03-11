// src/app/(app)/admin/audit/page.tsx
import { requireRole } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { getAuditLogs } from '@/actions/audit'
import { format } from 'date-fns'
import { ShieldCheck, History } from 'lucide-react'
import { AuditLogViewer } from '@/components/admin/AuditLogViewer'

export default async function AuditLogsPage({
  searchParams,
}: {
  searchParams?: { userId?: string; entityType?: string; dateFrom?: string; dateTo?: string; page?: string }
}) {
  await requireRole('ADMIN')

  const page = Number(searchParams?.page ?? 1)
  const { logs, total } = await getAuditLogs({
    userId: searchParams?.userId,
    entityType: searchParams?.entityType,
    dateFrom: searchParams?.dateFrom,
    dateTo: searchParams?.dateTo,
    page,
    pageSize: 50,
  })

  const users = await prisma.user.findMany({
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  })

  return (
    <div className="space-y-5 max-w-[1200px]">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
          <History className="h-4.5 w-4.5 text-primary" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-foreground">Denetim Kayıtları</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            {total} kayıt · Tüm sistem değişiklikleri
          </p>
        </div>
      </div>

      <AuditLogViewer
        logs={logs.map(l => ({
          ...l,
          oldValues: l.oldValues as Record<string, any> | null,
          newValues: l.newValues as Record<string, any> | null,
          timestamp: l.timestamp.toISOString(),
        }))}
        users={users}
        total={total}
        page={page}
        currentFilters={{
          userId: searchParams?.userId,
          entityType: searchParams?.entityType,
          dateFrom: searchParams?.dateFrom,
          dateTo: searchParams?.dateTo,
        }}
      />
    </div>
  )
}
