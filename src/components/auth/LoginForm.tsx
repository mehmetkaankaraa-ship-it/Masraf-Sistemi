// src/components/auth/LoginForm.tsx
'use client'
import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Loader2, AlertCircle, ArrowRight } from 'lucide-react'

export function LoginForm() {
  const router            = useRouter()
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)

  // ── Auth logic — untouched ─────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const fd     = new FormData(e.currentTarget)
    const result = await signIn('credentials', {
      email:    fd.get('email'),
      password: fd.get('password'),
      redirect: false,
    })

    setLoading(false)
    if (result?.error) {
      if (result.error === 'CallbackRouteError') {
        setError('Hesabınız devre dışı bırakılmıştır. Yöneticinizle iletişime geçin.')
      } else {
        setError('E-posta veya şifre hatalı.')
      }
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }
  // ──────────────────────────────────────────────────────────────────

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      {/* Error banner */}
      {error && (
        <div className="flex items-start gap-2.5 rounded-xl px-3.5 py-3 bg-red-50 border border-red-200/80">
          <AlertCircle className="h-[15px] w-[15px] text-red-500 shrink-0 mt-px" />
          <p className="text-[12.5px] text-red-700 leading-snug">{error}</p>
        </div>
      )}

      {/* Email */}
      <div className="space-y-1.5">
        <label htmlFor="email" className="block text-[12px] font-medium text-zinc-700">
          E-posta adresi
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          autoFocus
          placeholder="ad@buro.com"
          disabled={loading}
          className={[
            'w-full h-10 rounded-xl px-3.5 text-[13px] bg-zinc-50',
            'border border-zinc-200 text-zinc-900',
            'placeholder:text-zinc-400',
            'outline-none transition-all duration-150',
            'focus:bg-white focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10',
            'disabled:opacity-50 disabled:cursor-not-allowed',
          ].join(' ')}
        />
      </div>

      {/* Password */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label htmlFor="password" className="block text-[12px] font-medium text-zinc-700">
            Şifre
          </label>
        </div>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          placeholder="••••••••"
          disabled={loading}
          className={[
            'w-full h-10 rounded-xl px-3.5 text-[13px] bg-zinc-50',
            'border border-zinc-200 text-zinc-900',
            'placeholder:text-zinc-400',
            'outline-none transition-all duration-150',
            'focus:bg-white focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10',
            'disabled:opacity-50 disabled:cursor-not-allowed',
          ].join(' ')}
        />
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={loading}
        className={[
          'relative w-full h-10 rounded-xl text-[13px] font-medium',
          'bg-zinc-900 text-white',
          'flex items-center justify-center gap-2',
          'transition-all duration-150',
          'hover:bg-zinc-800 active:scale-[0.98]',
          'disabled:opacity-60 disabled:cursor-not-allowed',
          'shadow-[0_1px_2px_rgba(0,0,0,0.15),0_1px_0_rgba(255,255,255,0.06)_inset]',
        ].join(' ')}
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Giriş yapılıyor…</span>
          </>
        ) : (
          <>
            <span>Giriş Yap</span>
            <ArrowRight className="h-3.5 w-3.5 opacity-70" />
          </>
        )}
      </button>

    </form>
  )
}
