// src/lib/prisma.ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

// Always cache the singleton on globalThis.
// In development this prevents multiple instances from Next.js hot-reload.
// In production this prevents multiple instances within the same serverless
// process lifetime (important for Neon connection pooling).
globalForPrisma.prisma = prisma
