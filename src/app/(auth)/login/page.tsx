// src/app/(auth)/login/page.tsx
import { LoginForm } from '@/components/auth/LoginForm'
import { Scale } from 'lucide-react'

export default function LoginPage() {
  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#f9fafb] px-4 py-12">

      {/* ── Background blobs ──────────────────────────────────────────── */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 20% -10%, rgba(99,102,241,0.07) 0%, transparent 60%),' +
            'radial-gradient(ellipse 60% 40% at 80% 110%, rgba(14,165,233,0.06) 0%, transparent 60%)',
        }}
      />

      {/* ── Subtle dot grid ───────────────────────────────────────────── */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0"
        style={{
          backgroundImage:
            'radial-gradient(circle, rgba(0,0,0,0.06) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      {/* ── Card wrapper ──────────────────────────────────────────────── */}
      <div className="relative z-10 w-full max-w-[400px]">

        {/* Brand */}
        <div className="flex flex-col items-center text-center mb-8 select-none">
          <div className="w-11 h-11 rounded-[14px] bg-zinc-900 flex items-center justify-center mb-4 shadow-md">
            <Scale className="h-5 w-5 text-white" />
          </div>
          <h1 className="text-[20px] font-semibold tracking-[-0.3px] text-zinc-900">
            Masraf Ledger
          </h1>
          <p className="text-[12.5px] text-zinc-500 mt-1 leading-relaxed max-w-[260px]">
            Modern hukuk büroları için profesyonel gider yönetimi
          </p>
        </div>

        {/* Login card */}
        <div
          className="bg-white rounded-[20px] p-8"
          style={{
            border: '1px solid rgba(0,0,0,0.08)',
            boxShadow:
              '0 1px 2px rgba(0,0,0,0.04), 0 4px 8px rgba(0,0,0,0.04), 0 16px 32px rgba(0,0,0,0.05)',
          }}
        >
          {/* Card heading */}
          <div className="mb-7">
            <h2 className="text-[16px] font-semibold text-zinc-900 tracking-[-0.2px]">
              Hesabınıza giriş yapın
            </h2>
            <p className="text-[12.5px] text-zinc-500 mt-1">
              Devam etmek için e-posta ve şifrenizi girin.
            </p>
          </div>

          <LoginForm />
        </div>

        {/* Footer */}
        <p className="text-center text-[11px] text-zinc-400 mt-6 select-none">
          © {new Date().getFullYear()} Masraf Ledger · Yalnızca yetkili personel
        </p>

      </div>
    </div>
  )
}
