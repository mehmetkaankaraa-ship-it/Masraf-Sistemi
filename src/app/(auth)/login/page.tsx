// src/app/(auth)/login/page.tsx
import { LoginForm } from '@/components/auth/LoginForm'
import { Scale, Shield } from 'lucide-react'

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fafafa] px-4">

      {/* Subtle dot grid */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, hsl(220 13% 91%) 1px, transparent 0)',
          backgroundSize: '28px 28px',
          opacity: 0.6,
        }}
      />

      {/* Card wrapper */}
      <div className="relative w-full max-w-[380px]">

        {/* Logo + Brand */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-foreground flex items-center justify-center mb-4 shadow-sm">
            <Scale className="h-6 w-6 text-background" />
          </div>
          <h1 className="text-[22px] font-semibold tracking-tight text-foreground">
            Masraf Ledger
          </h1>
          <p className="text-[13px] text-muted-foreground mt-1">
            Hukuk bürosu gider yönetimi
          </p>
        </div>

        {/* Login card */}
        <div className="bg-white rounded-2xl border border-border/60 shadow-[0_2px_16px_rgba(0,0,0,0.06)] p-7">
          <div className="mb-6">
            <h2 className="text-[15px] font-semibold text-foreground">Giriş Yap</h2>
            <p className="text-[12px] text-muted-foreground mt-0.5">
              Hesabınıza erişmek için bilgilerinizi girin.
            </p>
          </div>

          <LoginForm />
        </div>

        {/* Security footer */}
        <div className="flex items-center justify-center gap-1.5 mt-5">
          <Shield className="h-3 w-3 text-muted-foreground/50" />
          <p className="text-[11px] text-muted-foreground/50 select-none">
            Güvenli erişim · Yalnızca yetkili personel
          </p>
        </div>

      </div>
    </div>
  )
}
