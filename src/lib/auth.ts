// src/lib/auth.ts
import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { z } from "zod"
import type { Role } from "@prisma/client"
import { prisma } from "./prisma"

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

export const { handlers, signIn, signOut, auth } = NextAuth({
  // Required in production on Vercel (behind a reverse proxy).
  // Without this, NextAuth v5 rejects the host header → CSRF fails → login fails.
  trustHost: true,

  // Explicitly read secret so both NEXTAUTH_SECRET and AUTH_SECRET work.
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,

  providers: [
    Credentials({
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials)
        if (!parsed.success) return null

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
        })
        if (!user) return null

        // Guard: if passwordHash doesn't look like a bcrypt hash, it is plain-text.
        // bcrypt hashes always start with "$2a$", "$2b$", or "$2y$".
        const looksLikeHash = /^\$2[aby]\$\d+\$/.test(user.passwordHash)
        if (!looksLikeHash) {
          console.error(
            `[auth] User ${user.email} has a plain-text password. Run scripts/fixPasswords.ts to fix.`,
          )
          return null
        }

        const passwordMatch = await bcrypt.compare(parsed.data.password, user.passwordHash)
        if (!passwordMatch) return null

        if (!user.isActive) return null

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as any).id as string
        token.role = (user as any).role as Role
      }
      return token
    },
    async session({ session, token }) {
      ;(session.user as any).id = token.id as string
      ;(session.user as any).role = token.role as Role
      return session
    },
  },
  pages: {
    signIn: "/login",
  },
  session: { strategy: "jwt" },
})