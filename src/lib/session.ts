// src/lib/session.ts
import { auth } from './auth'
import { redirect } from 'next/navigation'
import type { Role } from '@prisma/client'

export async function getSession() {
  const session = await auth()
  return session
}

export async function requireSession() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  return session
}

export async function requireRole(role: Role) {
  const session = await requireSession()
  if (session.user.role !== role) redirect('/dashboard')
  return session
}

export async function isAdmin() {
  const session = await auth()
  return session?.user?.role === 'ADMIN'
}
