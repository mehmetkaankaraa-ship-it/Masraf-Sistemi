// src/app/(app)/admin/users/page.tsx
export const dynamic = 'force-dynamic'

import { requireRole } from '@/lib/session'
import { getAllEmployeeSummaries } from '@/actions/advances'
import { getRecentActivity } from '@/actions/admin'
import { AddUserModal } from '@/components/admin/AddUserModal'
import { EditUserModal } from '@/components/admin/EditUserModal'
import { UsersFilterBar } from '@/components/admin/UsersFilterBar'
import { Decimal } from '@prisma/client/runtime/library'
import { format } from 'date-fns'
import Link from 'next/link'
import { Suspense } from 'react'
import {
  ShieldCheck, Users, Activity, Banknote, Receipt,
  RotateCcw, ArrowUpRight, Wallet,
} from 'lucide-react'

type PageProps = {
  searchParams: { filter?: string; q?: string }
}

function onlineStatus(lastActiveAt: Date | null) {
  if (!lastActiveAt) return { dot: 'bg-gray-300', label: 'Çevrimdışı', text: 'text-gray-400' }
  const diff = Date.now() - new Date(lastActiveAt).getTime()
  if (diff < 2 * 60 * 1000)  return { dot: 'bg-emerald-400', label: 'Çevrimiçi',      text: 'text-emerald-600' }
  if (diff < 10 * 60 * 1000) return { dot: 'bg-amber-400',   label: 'Son zamanlarda', text: 'text-amber-600'   }
  return { dot: 'bg-gray-300', label: 'Çevrimdışı', text: 'text-gray-400' }
}

function timeAgo(date: Date | null) {
  if (!date) return '—'
  const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (diff < 60)    return 'az önce'
  if (diff < 3600)  return `${Math.floor(diff / 60)} dk önce`
  if (diff < 86400) return `${Math.floor(diff / 3600)} sa önce`
  return `${Math.floor(diff / 86400)} gün önce`
}

function formatTRY(v: any) {
  const n = v instanceof Decimal ? v.toNumber() : Number(v)
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(n)
}

const txTypeConfig = {
  ADVANCE:       { label: 'Avans',   bg: 'bg-blue-50',    text: 'text-blue-700',    icon: Banknote    },
  EXPENSE:       { label: 'Harcama', bg: 'bg-orange-50',  text: 'text-orange-700',  icon: Receipt     },
  REFUND:        { label: 'İade',    bg: 'bg-emerald-50', text: 'text-emerald-700', icon: RotateCcw   },
  USER_TRANSFER: { label: 'Transfer', bg: 'bg-violet-50', text: 'text-violet-700',  icon: ArrowUpRight },
}

export default async function AdminUsersPage({ searchParams }: PageProps) {
  await requireRole('ADMIN')

  const rawFilter = searchParams.filter
  const filter = (rawFilter === 'inactive' || rawFilter === 'all') ? rawFilter : 'active'
  const search = searchParams.q ?? ''

  const [allSummaries, filtered, activity] = await Promise.all([
    getAllEmployeeSummaries(),                    // for counts in filter bar
    getAllEmployeeSummaries({ filter, search }),  // displayed rows
    getRecentActivity(20),
  ])

  const totalActive   = allSummaries.filter(u => u.isActive).length
  const totalInactive = allSummaries.filter(u => !u.isActive).length

  return (
    <div className="space-y-5 max-w-[1100px]">

      {/* Page header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Kullanıcı Yönetimi</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            {filtered.length} kullanıcı gösteriliyor
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/accounts"
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-white border text-[13px] font-medium rounded-xl hover:bg-muted/40 transition-colors"
          >
            <Banknote className="h-3.5 w-3.5 text-muted-foreground" />
            Kaynak Hesaplar
          </Link>
          <AddUserModal />
        </div>
      </div>

      {/* Filter + search bar */}
      <Suspense fallback={null}>
        <UsersFilterBar totalActive={totalActive} totalInactive={totalInactive} />
      </Suspense>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-5 items-start">

        {/* Users + balances table */}
        <div className="bg-white rounded-2xl border card-shadow overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3.5 border-b">
            <Users className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-[13px] font-semibold">Kullanıcılar ve Avans Bakiyeleri</h2>
            <span className="ml-auto text-[11px] text-muted-foreground">{filtered.length} kayıt</span>
          </div>

          {filtered.length === 0 ? (
            <div className="px-5 py-12 text-center text-[13px] text-muted-foreground">
              {search ? `"${search}" için sonuç bulunamadı.` : 'Bu filtrede kullanıcı yok.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-muted/25 border-b">
                    {['Ad', 'Durum', 'Rol', 'Alınan Avans', 'Harcama', 'Kalan', 'Kayıt', ''].map((h, i) => (
                      <th
                        key={i}
                        className={`px-4 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide ${
                          i >= 3 && i <= 5 ? 'text-right' : 'text-left'
                        }`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filtered.map((user) => {
                    const rem = user.remaining.toNumber()
                    return (
                      <tr
                        key={user.id}
                        className={`hover:bg-muted/15 transition-colors ${!user.isActive ? 'opacity-60' : ''}`}
                      >
                        {/* Name + email */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                              user.isActive ? 'bg-primary/10' : 'bg-muted'
                            }`}>
                              <span className={`text-[10px] font-bold ${
                                user.isActive ? 'text-primary' : 'text-muted-foreground'
                              }`}>
                                {user.name.slice(0, 2).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <Link
                                  href={`/admin/users/${user.id}`}
                                  className="text-[13px] font-medium text-foreground hover:text-primary transition-colors"
                                >
                                  {user.name}
                                </Link>
                                {!user.isActive && (
                                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 text-red-600">
                                    Pasif
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-muted-foreground">{user.email}</p>
                              {!user.isActive && (user as any).deactivatedAt && (
                                <p className="text-[10px] text-red-400 mt-0.5">
                                  Devre dışı: {format(new Date((user as any).deactivatedAt), 'dd MMM yyyy')}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Online status */}
                        <td className="px-4 py-3">
                          {user.isActive ? (
                            (() => {
                              const s = onlineStatus((user as any).lastActiveAt ?? null)
                              return (
                                <div className="flex items-center gap-1.5">
                                  <span className={`w-2 h-2 rounded-full shrink-0 ${s.dot}`} />
                                  <span className={`text-[11px] ${s.text} whitespace-nowrap`}>
                                    {s.label === 'Çevrimdışı'
                                      ? timeAgo((user as any).lastActiveAt ?? null)
                                      : s.label}
                                  </span>
                                </div>
                              )
                            })()
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full shrink-0 bg-gray-300" />
                              <span className="text-[11px] text-muted-foreground">Devre dışı</span>
                            </div>
                          )}
                        </td>

                        {/* Role */}
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${
                            user.role === 'ADMIN' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                          }`}>
                            {user.role === 'ADMIN' && <ShieldCheck className="h-2.5 w-2.5" />}
                            {user.role}
                          </span>
                        </td>

                        {/* Advance */}
                        <td className="px-4 py-3 text-right text-[13px] font-medium text-violet-600 tabular-nums">
                          {formatTRY(user.totalTransferred)}
                        </td>

                        {/* Expenses */}
                        <td className="px-4 py-3 text-right text-[13px] font-medium text-orange-600 tabular-nums">
                          {formatTRY(user.totalExpenses)}
                        </td>

                        {/* Balance */}
                        <td className={`px-4 py-3 text-right text-[13px] font-bold tabular-nums ${
                          rem >= 0 ? 'text-emerald-600' : 'text-red-600'
                        }`}>
                          <div className="flex items-center justify-end gap-1.5">
                            <Wallet className="h-3 w-3 opacity-60" />
                            {formatTRY(user.remaining)}
                          </div>
                        </td>

                        {/* Joined */}
                        <td className="px-4 py-3 text-[12px] text-muted-foreground whitespace-nowrap">
                          {format(new Date(user.createdAt), 'dd.MM.yyyy')}
                        </td>

                        {/* Edit */}
                        <td className="px-4 py-3">
                          <EditUserModal user={{
                            id:       user.id,
                            name:     user.name,
                            email:    user.email,
                            role:     user.role,
                            isActive: user.isActive,
                          }} />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Activity log */}
        <div className="bg-white rounded-2xl border card-shadow overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3.5 border-b">
            <Activity className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-[13px] font-semibold">Son Aktiviteler</h2>
          </div>
          <div className="divide-y divide-border/60 overflow-y-auto" style={{ maxHeight: '520px' }}>
            {activity.length === 0 ? (
              <div className="px-5 py-8 text-center text-[13px] text-muted-foreground">Henüz aktivite yok.</div>
            ) : (
              activity.map((tx) => {
                const cfg = txTypeConfig[tx.type as keyof typeof txTypeConfig] ?? txTypeConfig.EXPENSE
                const Icon = cfg.icon
                return (
                  <div key={tx.id} className="px-4 py-3 hover:bg-muted/15 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5 min-w-0">
                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${cfg.bg}`}>
                          <Icon className={`h-3 w-3 ${cfg.text}`} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}>
                              {cfg.label}
                            </span>
                            <Link
                              href={`/clients/${tx.client.id}`}
                              className="text-[12px] font-medium text-foreground hover:text-primary transition-colors truncate"
                            >
                              {tx.client.name}
                            </Link>
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {tx.createdBy?.name ?? 'Bilinmiyor'} — {format(new Date(tx.createdAt), 'dd.MM.yyyy HH:mm')}
                          </p>
                        </div>
                      </div>
                      <span className={`text-[12px] font-semibold tabular-nums shrink-0 ${cfg.text}`}>
                        {formatTRY(tx.amount)}
                      </span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
