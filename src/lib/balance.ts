// src/lib/balance.ts
// ─────────────────────────────────────────────────────────────────────────────
// CLIENT-SAFE utilities only.
// Do NOT import prisma or @prisma/client here – this file is imported by
// both Server Components and Client Components (LedgerTable, modals).
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Format a TRY amount with Turkish locale and ₺ symbol.
 * Accepts number | string (Decimal .toString() output is fine).
 */
export function formatTRY(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 2,
  }).format(num)
}

/**
 * Determine whether a transaction type increases (+) the wallet balance.
 * ADVANCE → true  (money comes IN from client)
 * EXPENSE → false (money goes OUT)
 * REFUND  → false (money goes OUT back to client)
 */
export function isInflow(type: string): boolean {
  return type === 'ADVANCE'
}

/**
 * Universal color rule for amounts:
 *  + => green
 *  - => red
 *  0 => muted
 *
 * Use this for BALANCE numbers (where the value itself can be negative).
 */
export function amountColorClass(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  if (Number.isNaN(num) || !Number.isFinite(num)) return 'text-muted-foreground'
  if (num > 0) return 'text-green-600'
  if (num < 0) return 'text-red-600'
  return 'text-muted-foreground'
}

/**
 * Color rule for TRANSACTION rows:
 * ADVANCE shown as + (green), EXPENSE/REFUND shown as - (red)
 */
export function txAmountColorClass(type: string): string {
  return isInflow(type) ? 'text-green-600' : 'text-red-600'
}

/**
 * Prefix for TRANSACTION rows: + for inflow, - for outflow
 */
export function txSign(type: string): '+' | '-' {
  return isInflow(type) ? '+' : '-'
}