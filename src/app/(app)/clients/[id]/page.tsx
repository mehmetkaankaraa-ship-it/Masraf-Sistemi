import Link from "next/link"
import { notFound } from "next/navigation"
import type { ReactNode } from "react"
import { format } from "date-fns"
import { tr } from "date-fns/locale"
import { Decimal } from "@prisma/client/runtime/library"
import {
  ArrowLeft,
  Wallet,
  Phone,
  Mail,
  MapPin,
  Hash,
  FileText,
  Pencil,
  CalendarDays,
  Receipt,
  Building2,
  FolderOpen,
} from "lucide-react"

import { requireSession } from "@/lib/session"
import { getClientById } from "@/actions/clients"
import { computeBalance } from "@/lib/balance.server"
import { getTransactionsByClient } from "@/actions/transactions"
import { prisma } from "@/lib/prisma"
import { TransactionsTabClient } from "@/components/clients/TransactionsTabClient"
import { LedgerTable } from "@/components/transactions/LedgerTable"
import CreateProjectModal from "@/components/projects/CreateProjectModal"
import { DeleteClientButton } from "@/components/clients/DeleteClientButton"

type PageProps = {
  params: { id: string }
  searchParams?: { tab?: string }
}

type ClientData = NonNullable<Awaited<ReturnType<typeof getClientById>>>

function formatTRY(value: number | Decimal) {
  const n = value instanceof Decimal ? value.toNumber() : Number(value)
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 2,
  }).format(n)
}

async function getProjectExpenses(clientId: string): Promise<Map<string, Decimal>> {
  const rows = await prisma.ledgerTransaction.findMany({
    where: { clientId, type: "EXPENSE", projectId: { not: null } },
    select: { projectId: true, amount: true },
  })

  const map = new Map<string, Decimal>()

  for (const r of rows) {
    if (!r.projectId) continue
    const prev = map.get(r.projectId) ?? new Decimal(0)
    map.set(r.projectId, prev.add(r.amount))
  }

  return map
}

export default async function ClientDetailPage({
  params,
  searchParams,
}: PageProps) {
  const session = await requireSession()
  const tab = (searchParams?.tab ?? "").toLowerCase()
  const isTransactionsTab = tab === "transactions"

  const client = await getClientById(params.id)
  if (!client) notFound()

  const balance = await computeBalance(client.id)
  const balanceNum = balance.toNumber()

  return (
    <div className="space-y-5 max-w-[1060px]">
      {/* Back nav */}
      <Link
        href="/clients"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Müvekkillere Dön
      </Link>

      {/* Header card */}
      <div className="bg-white rounded-2xl border card-shadow px-6 py-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-full bg-primary flex items-center justify-center shrink-0">
              <span className="text-sm font-bold text-primary-foreground">
                {client.name.slice(0, 2).toUpperCase()}
              </span>
            </div>

            <div>
              <h1 className="text-lg font-semibold text-foreground">{client.name}</h1>
              <p className="text-sm text-muted-foreground">
                {client.email ?? ""}
                {client.email && client.phone ? " · " : ""}
                {client.phone ?? ""}
                {!client.email && !client.phone ? "Iletisim bilgisi yok" : ""}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-muted/50 border">
              <Wallet className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide leading-tight">
                  Bakiye
                </p>
                <p
                  className={`text-sm font-bold tabular-nums leading-tight ${
                    balanceNum < 0 ? "text-destructive" : "text-emerald-600"
                  }`}
                >
                  {formatTRY(balance)}
                </p>
              </div>
            </div>

            <CreateProjectModal clientId={client.id} />
          </div>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 bg-white border rounded-xl p-1 w-fit card-shadow">
        {[
          {
            label: "Genel",
            href: `/clients/${client.id}`,
            active: !isTransactionsTab,
          },
          {
            label: "İşlemler",
            href: `/clients/${client.id}?tab=transactions`,
            active: isTransactionsTab,
          },
          {
            label: "Ekstre (PDF)",
            href: `/clients/${client.id}/statement`,
            active: false,
          },
        ].map(({ label, href, active }) => (
          <Link
            key={label}
            href={href}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-150 ${
              active
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-accent"
            }`}
          >
            {label}
          </Link>
        ))}
      </div>

      {/* Tab content */}
      {!isTransactionsTab ? (
        <GeneralTab client={client} balance={balance} isAdmin={session.user.role === "ADMIN"} />
      ) : (
        <TransactionsSection
          clientId={client.id}
          isAdmin={session.user.role === "ADMIN"}
          projects={(client.projects ?? []).map((p: any) => ({
            id: p.id,
            fileNo: p.fileNo,
            title: p.title,
          }))}
          currentUserId={session.user.id}
        />
      )}
    </div>
  )
}

/* General Tab */

async function GeneralTab({
  client,
  balance,
  isAdmin,
}: {
  client: ClientData
  balance: Decimal
  isAdmin: boolean
}) {
  const balanceNum = balance.toNumber()
  const projectExpenses = await getProjectExpenses(client.id)

  return (
    <div className="space-y-4">
      {/* Big balance banner */}
      <div
        className={`rounded-2xl border card-shadow px-8 py-7 flex flex-col md:flex-row items-center justify-between gap-4 ${
          balanceNum >= 0
            ? "bg-gradient-to-r from-emerald-600 to-emerald-500"
            : "bg-gradient-to-r from-red-600 to-red-500"
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
            <Wallet className="h-5 w-5 text-white" />
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-white/70">
              Toplam Bakiye
            </p>
            <p className="text-[11px] text-white/60 mt-0.5">
              Avans - Harcama - Iade
            </p>
          </div>
        </div>

        <div className="text-right">
          <p className="text-3xl font-extrabold text-white tabular-nums tracking-tight">
            {formatTRY(balance)}
          </p>
          <p className="text-[11px] text-white/60 mt-0.5">
            {(client._count as any)?.transactions ?? 0} islem ·{" "}
            {(client._count as any)?.projects ?? 0} proje
          </p>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left: Client info */}
        <div className="bg-white rounded-2xl border card-shadow overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-[13px] font-semibold text-foreground">
                Müvekkil Bilgileri
              </h2>
            </div>

            <div className="flex items-center gap-1">
              <Link
                href={`/clients/${client.id}/edit`}
                className="inline-flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground hover:text-foreground transition-colors px-2.5 py-1 rounded-lg hover:bg-muted/50"
              >
                <Pencil className="h-3 w-3" />
                Düzenle
              </Link>
              {isAdmin && (
                <DeleteClientButton
                  clientId={client.id}
                  clientName={client.name}
                  projectCount={(client._count as any)?.projects ?? 0}
                />
              )}
            </div>
          </div>

          <div className="p-5 space-y-3.5">
            {client.taxId ? (
              <InfoRow
                icon={<Hash className="h-3.5 w-3.5" />}
                label="Vergi No"
                value={client.taxId}
              />
            ) : null}

            {client.address ? (
              <InfoRow
                icon={<MapPin className="h-3.5 w-3.5" />}
                label="Adres"
                value={client.address}
              />
            ) : null}

            {client.phone ? (
              <InfoRow
                icon={<Phone className="h-3.5 w-3.5" />}
                label="Telefon"
                value={client.phone}
              />
            ) : null}

            {client.email ? (
              <InfoRow
                icon={<Mail className="h-3.5 w-3.5" />}
                label="E-posta"
                value={
                  <a
                    href={`mailto:${client.email}`}
                    className="hover:text-primary transition-colors"
                  >
                    {client.email}
                  </a>
                }
              />
            ) : null}

            {client.notes ? (
              <InfoRow
                icon={<FileText className="h-3.5 w-3.5" />}
                label="Notlar"
                value={client.notes}
              />
            ) : null}

            {!client.taxId &&
            !client.address &&
            !client.phone &&
            !client.email &&
            !client.notes ? (
              <p className="text-[13px] text-muted-foreground py-2">
                Ek bilgi girilmemis.{" "}
                <Link
                  href={`/clients/${client.id}/edit`}
                  className="text-primary hover:underline"
                >
                  Düzenle
                </Link>
              </p>
            ) : null}

            <div className="pt-2 border-t">
              <p className="text-[10px] text-muted-foreground">
                Kayıt: {format(new Date(client.createdAt), "dd MMM yyyy", { locale: tr })}
                {(client as any).createdBy?.name
                  ? ` · ${(client as any).createdBy.name}`
                  : ""}
              </p>
            </div>
          </div>
        </div>

        {/* Right: Project list */}
        <div className="bg-white rounded-2xl border card-shadow overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-[13px] font-semibold text-foreground">Projeler</h2>
            </div>

            <span className="text-[11px] text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">
              {(client.projects ?? []).length} proje
            </span>
          </div>

          <div className="divide-y divide-border/60">
            {(client.projects ?? []).length === 0 ? (
              <div className="px-5 py-10 text-center">
                <FolderOpen className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-[13px] text-muted-foreground">Henüz proje yok.</p>
                <p className="text-[11px] text-muted-foreground/60 mt-1">
                  Yeni proje eklemek icin ust kisimdaki butonu kullanin.
                </p>
              </div>
            ) : (
              (client.projects as any[]).map((project) => {
                const expense = projectExpenses.get(project.id) ?? new Decimal(0)

                return (
                  <Link
                    key={project.id}
                    href={`/projects/${project.id}`}
                    className="flex items-start justify-between gap-3 px-5 py-3.5 hover:bg-muted/15 transition-colors group"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[10px] font-mono text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded">
                          {project.fileNo}
                        </span>

                        {project.closedAt ? (
                          <span className="text-[10px] text-muted-foreground bg-muted/40 px-1.5 py-0.5 rounded">
                            Kapali
                          </span>
                        ) : null}
                      </div>

                      <p className="text-[13px] font-medium text-foreground group-hover:text-primary transition-colors truncate">
                        {project.title}
                      </p>

                      <div className="flex items-center gap-1 mt-0.5">
                        <CalendarDays className="h-3 w-3 text-muted-foreground/60" />
                        <span className="text-[10px] text-muted-foreground">
                          {format(new Date(project.createdAt), "dd.MM.yyyy")}
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="flex items-center gap-1 justify-end mb-0.5">
                        <Receipt className="h-3 w-3 text-muted-foreground/60" />
                        <span className="text-[10px] text-muted-foreground">Harcama</span>
                      </div>

                      <p
                        className={`text-[13px] font-semibold tabular-nums ${
                          expense.isZero() ? "text-muted-foreground" : "text-orange-600"
                        }`}
                      >
                        {formatTRY(expense)}
                      </p>
                    </div>
                  </Link>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/* InfoRow helper */

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: ReactNode
  label: string
  value: ReactNode
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-6 h-6 rounded-lg bg-muted/60 flex items-center justify-center shrink-0 mt-0.5 text-muted-foreground">
        {icon}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">
          {label}
        </p>
        <div className="text-[13px] text-foreground break-words">{value}</div>
      </div>
    </div>
  )
}

/* Transactions Section */

async function TransactionsSection({
  clientId,
  isAdmin,
  projects,
  currentUserId,
}: {
  clientId: string
  isAdmin: boolean
  projects: { id: string; fileNo: string; title: string }[]
  currentUserId: string
}) {
  const res = await getTransactionsByClient(clientId)
  if ("error" in res) return null

  return (
    <div className="space-y-4">
      <TransactionsTabClient
        clientId={clientId}
        isAdmin={isAdmin}
        projects={projects}
      />
      <LedgerTable
        transactions={res.transactions}
        clientId={clientId}
        projects={projects}
        isAdmin={isAdmin}
        currentUserId={currentUserId}
      />
    </div>
  )
}