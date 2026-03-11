// src/app/(app)/admin/accounts/page.tsx
import { requireRole } from '@/lib/session'
import { listSourceAccounts } from '@/actions/advances'
import { SourceAccountsClient } from '@/components/advances/SourceAccountsClient'

export default async function SourceAccountsPage() {
  await requireRole('ADMIN')
  const accounts = await listSourceAccounts(true) // include inactive
  return (
    <div className="space-y-5 max-w-[700px]">
      <div>
        <h1 className="text-lg font-semibold text-foreground">Kaynak Hesaplar</h1>
        <p className="text-[13px] text-muted-foreground mt-0.5">Avans transferlerinde kullanilan kaynak hesaplari yonetin.</p>
      </div>
      <SourceAccountsClient accounts={accounts} />
    </div>
  )
}
