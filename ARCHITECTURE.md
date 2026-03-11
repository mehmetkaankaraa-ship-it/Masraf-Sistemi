# Attorney Office Client Advance & Expense Ledger — Architecture Plan

## Overview

A multi-user, multi-role Next.js 14 (App Router) web application for law offices to track client advances and project expenses using a double-entry-style ledger.

---

## Technology Decisions

| Concern | Choice | Reason |
|---|---|---|
| Framework | Next.js 14 App Router | File-based routing, RSC, streaming |
| ORM | Prisma | Type-safe DB access, migrations |
| Database | PostgreSQL (Docker) | ACID, decimal precision for money |
| Auth | NextAuth v5 (beta) Credentials | Simple username/password, role in JWT |
| UI | Tailwind + shadcn/ui | Accessible, customizable components |
| Validation | Zod | Runtime + compile-time schema sharing |
| File storage | Local `/uploads` (dev) | MVP-appropriate; swap to S3 in prod |
| Server mutations | **Server Actions** | Co-located with components, type-safe, no extra route boilerplate |

> **Server Actions vs Route Handlers**: We use Server Actions for all mutations (create client, add transaction, upload file). Route Handlers are used only for file streaming (`GET /api/uploads/[key]`) and NextAuth's auth endpoint.

---

## Domain Model

```
User
 └── creates → Client
                 ├── has many → Project
                 └── has many → LedgerTransaction
                                 ├── optionally linked → Project
                                 └── has many → Attachment
```

### Ledger Rules

- `amount` always stored as positive `Decimal`.
- **Signed effect**:
  - `ADVANCE`, `PAYMENT` → **+amount** (money received from client)
  - `EXPENSE`, `REFUND` → **–amount** (money spent or returned)
  - `ADJUSTMENT` → uses `direction: IN | OUT` field; IN = +, OUT = –
- Balance = `SUM(+amounts) - SUM(-amounts)` — computed at query time, never stored.
- Normal users: expense blocked if it would drop balance < 0.
- Admins: can override (pass `forceNegative: true` flag from UI).

---

## Authorization

- **ADMIN**: full access to all clients, projects, transactions, users.
- **USER**: sees only clients/projects/transactions they created (`createdById`).
- Middleware (`middleware.ts`) protects all routes except `/login`.
- Role stored in JWT session via NextAuth `jwt` callback.

---

## Folder Structure

```
attorney-ledger/
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   └── login/page.tsx
│   │   ├── (app)/
│   │   │   ├── layout.tsx          ← app shell (sidebar, header)
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── clients/
│   │   │   │   ├── page.tsx        ← list
│   │   │   │   ├── new/page.tsx
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx    ← client detail
│   │   │   │       └── projects/
│   │   │   │           └── new/page.tsx
│   │   │   ├── projects/
│   │   │   │   └── [id]/page.tsx
│   │   │   └── admin/
│   │   │       └── users/page.tsx
│   │   └── api/
│   │       ├── auth/[...nextauth]/route.ts
│   │       └── uploads/
│   │           └── [key]/route.ts
│   ├── actions/                    ← Server Actions
│   │   ├── auth.ts
│   │   ├── clients.ts
│   │   ├── projects.ts
│   │   ├── transactions.ts
│   │   └── uploads.ts
│   ├── components/
│   │   ├── ui/                     ← shadcn generated
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx
│   │   │   └── Header.tsx
│   │   ├── clients/
│   │   │   ├── ClientList.tsx
│   │   │   └── ClientForm.tsx
│   │   ├── transactions/
│   │   │   ├── LedgerTable.tsx
│   │   │   ├── AddAdvanceModal.tsx
│   │   │   ├── AddExpenseModal.tsx
│   │   │   └── LedgerFilters.tsx
│   │   └── projects/
│   │       └── ProjectForm.tsx
│   ├── lib/
│   │   ├── prisma.ts               ← singleton client
│   │   ├── auth.ts                 ← NextAuth config
│   │   ├── session.ts              ← typed session helpers
│   │   └── balance.ts              ← balance calculation utils
│   ├── types/
│   │   └── next-auth.d.ts          ← module augmentation
│   └── middleware.ts
├── docker-compose.yml
├── .env.example
└── package.json
```

---

## Key Flows

### Add Expense
1. User opens AddExpenseModal on `/clients/[id]`.
2. Form validated client-side with Zod.
3. If file attached → first call `uploadFile` server action → returns `attachmentId`.
4. Call `createTransaction` server action with `type: EXPENSE`, `attachmentIds`.
5. Server action re-validates, fetches current balance, checks `balance - amount >= 0` (unless admin + forceNegative).
6. Prisma transaction: insert `LedgerTransaction` + link `Attachment` records.
7. `revalidatePath` → UI refreshes.

### Balance Calculation
```sql
SELECT
  currency,
  SUM(CASE WHEN type IN ('ADVANCE','PAYMENT') THEN amount
           WHEN type = 'ADJUSTMENT' AND direction = 'IN' THEN amount
           ELSE 0 END)
  -
  SUM(CASE WHEN type IN ('EXPENSE','REFUND') THEN amount
           WHEN type = 'ADJUSTMENT' AND direction = 'OUT' THEN amount
           ELSE 0 END)
  AS balance
FROM LedgerTransaction
WHERE clientId = ? [AND projectId = ?]
GROUP BY currency
```
Implemented via `prisma.$queryRaw` or Prisma `groupBy` + JS aggregation.
