// src/app/(app)/settings/page.tsx
import { requireSession } from '@/lib/session'
import { Settings } from 'lucide-react'

export default async function SettingsPage() {
  await requireSession()

  return (
    <div className="max-w-[560px]">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-foreground">Ayarlar</h1>
        <p className="text-[13px] text-muted-foreground mt-0.5">Hesap ve uygulama ayarları</p>
      </div>

      <div className="bg-white rounded-xl border card-shadow">
        <div className="py-16 text-center px-8">
          <div className="w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
            <Settings className="h-5 w-5 text-muted-foreground/40" />
          </div>
          <p className="text-[14px] font-semibold text-foreground mb-1.5">Yakında</p>
          <p className="text-[13px] text-muted-foreground leading-relaxed">
            Profil yönetimi, şifre değişikliği ve bildirim tercihleri bu bölümde yer alacak.
          </p>
        </div>
      </div>
    </div>
  )
}
