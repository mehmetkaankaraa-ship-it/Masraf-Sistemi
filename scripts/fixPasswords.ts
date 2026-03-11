/**
 * scripts/fixPasswords.ts
 *
 * Finds every user whose passwordHash is NOT a valid bcrypt hash
 * (i.e. plain-text passwords like "Kaan_123") and re-hashes them.
 *
 * The script prints what it will do (dry-run) then asks for confirmation
 * before writing anything.  Pass --apply to skip the prompt.
 *
 * Usage:
 *   npx tsx scripts/fixPasswords.ts           # dry-run
 *   npx tsx scripts/fixPasswords.ts --apply   # apply changes
 *
 * After running, affected users must log in with their OLD (plain-text) password.
 * The script hashes that plain-text value so login will work from that point on.
 */

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import * as readline from 'readline'

const prisma = new PrismaClient()
const APPLY  = process.argv.includes('--apply')

/** bcrypt hashes always start with $2a$, $2b$, or $2y$ */
const isBcrypt = (s: string) => /^\$2[aby]\$\d+\$/.test(s)

async function confirm(question: string): Promise<boolean> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close()
      resolve(answer.trim().toLowerCase() === 'y')
    })
  })
}

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, name: true, passwordHash: true },
  })

  const broken = users.filter((u) => !isBcrypt(u.passwordHash))

  if (broken.length === 0) {
    console.log('✅ All users already have valid bcrypt hashes. Nothing to do.')
    return
  }

  console.log(`\nFound ${broken.length} user(s) with plain-text passwords:\n`)
  for (const u of broken) {
    console.log(`  • ${u.email} (id: ${u.id})  plain-text value: "${u.passwordHash}"`)
  }

  if (!APPLY) {
    console.log('\nThis is a DRY-RUN. No changes made.')
    console.log('Re-run with --apply to hash these passwords.\n')
    return
  }

  const ok = await confirm('\nApply bcrypt hashing to these users? (y/N) ')
  if (!ok) {
    console.log('Aborted.')
    return
  }

  let fixed = 0
  for (const u of broken) {
    // The plain-text value IS the user's current password — hash it so login works.
    const hash = await bcrypt.hash(u.passwordHash, 12)
    await prisma.user.update({
      where: { id: u.id },
      data:  { passwordHash: hash },
    })
    console.log(`  ✅ ${u.email} — hashed.`)
    fixed++
  }

  console.log(`\nDone. ${fixed} user(s) updated.`)
  console.log('These users can now log in with their original (plain-text) password.\n')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
