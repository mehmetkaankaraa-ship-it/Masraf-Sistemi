/**
 * scripts/createAdmin.ts
 *
 * Safely creates (or resets the password of) an ADMIN user.
 *
 * Usage:
 *   npx tsx scripts/createAdmin.ts
 *
 * Override defaults with env vars:
 *   ADMIN_EMAIL=me@example.com ADMIN_PASSWORD=Secret123! npx tsx scripts/createAdmin.ts
 */

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const EMAIL    = process.env.ADMIN_EMAIL    ?? 'admin@office.local'
const PASSWORD = process.env.ADMIN_PASSWORD ?? 'Admin123!'
const NAME     = process.env.ADMIN_NAME     ?? 'Admin User'

async function main() {
  if (PASSWORD.length < 8) {
    console.error('ERROR: password must be at least 8 characters.')
    process.exit(1)
  }

  const passwordHash = await bcrypt.hash(PASSWORD, 12)

  const user = await prisma.user.upsert({
    where:  { email: EMAIL },
    update: { passwordHash, role: 'ADMIN', name: NAME },
    create: { email: EMAIL, name: NAME, passwordHash, role: 'ADMIN' },
  })

  console.log(`✅ Admin user ready:`)
  console.log(`   id    : ${user.id}`)
  console.log(`   email : ${user.email}`)
  console.log(`   role  : ${user.role}`)
  console.log(`   hash  : ${user.passwordHash.slice(0, 20)}...`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
