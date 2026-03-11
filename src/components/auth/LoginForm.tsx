// src/components/auth/LoginForm.tsx
'use client'
import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Loader2, AlertCircle } from 'lucide-react'

export function LoginForm() {
  const router  = useRouter()
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)

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
      setError('E-posta veya şifre hatalı.')
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">

      {error && (
        <div className="flex items-center gap-2.5 rounded-xl px-3.5 py-3 bg-red-50 border border-red-200">
          <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
          <p className="text-[13px] text-red-700">{error}</p>
        </div>
      )}

      <div className="space-y-1.5">
        <label htmlFor="email" className="block text-[12px] font-medium text-foreground">
          E-posta
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="ad@buro.com"
          className="w-full h-9 rounded-xl border border-border bg-white px-3 text-[13px] text-foreground placeholder:text-muted-foreground/60 outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/10 disabled:opacity-50"
          disabled={loading}
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="password" className="block text-[12px] font-medium text-foreground">
          Şifre
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          placeholder="••••••••"
          className="w-full h-9 rounded-xl border border-border bg-white px-3 text-[13px] text-foreground placeholder:text-muted-foreground/60 outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/10 disabled:opacity-50"
          disabled={loading}
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full h-9 rounded-xl bg-foreground text-background text-[13px] font-medium flex items-center justify-center gap-2 hover:opacity-85 active:scale-[0.98] transition-all duration-150 disabled:opacity-60 mt-2"
      >
        {loading ? (
          <><Loader2 className="h-4 w-4 animate-spin" /> Giriş yapılıyor…</>
        ) : (
          'Giriş Yap'
        )}
      </button>

    </form>
  )
}
