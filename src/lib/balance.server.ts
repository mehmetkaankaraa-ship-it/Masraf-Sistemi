// src/lib/balance.server.ts
import { prisma } from '@/lib/prisma'
import { Decimal } from '@prisma/client/runtime/library'

/**
 * Client-level pooled balance:
 * ADVANCE increases, EXPENSE/REFUND decreases.
 */
export async function getBalance(clientId: string): Promise<Decimal> {
  const rows = await prisma.ledgerTransaction.findMany({
    where: { clientId },
    select: { type: true, amount: true },
  })

  let balance = new Decimal(0)
  for (const r of rows) {
    if (r.type === 'ADVANCE') balance = balance.add(r.amount)
    else balance = balance.sub(r.amount)
  }
  return balance
}

export { getBalance as computeBalance }
