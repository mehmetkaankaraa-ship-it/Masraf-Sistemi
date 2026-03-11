// src/app/(auth)/login/page.tsx
import { LoginForm } from '@/components/auth/LoginForm'

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40">
      <div className="w-full max-w-sm space-y-6 p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Hukuk Bürosu Ledger</h1>
          <p className="text-sm text-muted-foreground mt-1">Hesabınıza giriş yapın</p>
        </div>
        <LoginForm />
      </div>
    </div>
  )
}
