// src/lib/current-user.ts
import { prisma } from "@/lib/prisma"
import { requireSession } from "@/lib/session"

/**
 * Returns the real DB user using session email.
 * Guarantees we always use Prisma User.id (cuid).
 */
export async function requireCurrentUser() {
  const session = await requireSession()

  const email = session.user.email
  if (!email) {
    throw new Error("UNAUTHORIZED")
  }

  const user = await prisma.user.findUnique({
    where: { email },
  })

  if (!user) {
    throw new Error("UNAUTHORIZED")
  }

  return user
}