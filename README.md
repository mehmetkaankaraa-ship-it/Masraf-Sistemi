# Attorney Office Client Advance & Expense Ledger

A Next.js 14 (App Router) web application for law offices to track client advances and project expenses using a ledger-based balance system.

---

## Quick Start

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- Git

### 1. Clone & Install

```bash
git clone <repo-url>
cd attorney-ledger
npm install
```

### 2. Environment Setup

```bash
cp .env.example .env
# Edit .env if needed (defaults work for local Docker setup)
```

### 3. Start PostgreSQL

```bash
npm run db:up
# or: docker compose up -d
```

### 4. Run Database Migrations

```bash
npm run db:migrate
# When prompted for migration name, enter: init
```

### 5. Seed the Database

```bash
npm run db:seed
```

This creates:
- `admin@office.local` / `Admin123!` (ADMIN role)
- `user@office.local` / `User123!` (USER role)
- 1 sample client (Ahmet Yılmaz)
- 1 project (2024/001 — İş Davası)
- +20 TRY ADVANCE transaction
- -10 TRY EXPENSE transaction with a placeholder attachment

### 6. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Full Command Reference

| Command | Description |
|---|---|
| `npm run dev` | Start Next.js dev server |
| `npm run build` | Production build |
| `npm run db:up` | Start PostgreSQL container |
| `npm run db:down` | Stop PostgreSQL container |
| `npm run db:migrate` | Run Prisma migrations |
| `npm run db:push` | Push schema without migration (prototyping) |
| `npm run db:seed` | Seed database with sample data |
| `npm run db:studio` | Open Prisma Studio GUI |

---

## Folder Structure

```
src/
├── app/
│   ├── (auth)/login/          ← Login page
│   ├── (app)/                 ← Protected app routes
│   │   ├── layout.tsx         ← Sidebar + Header shell
│   │   ├── dashboard/         ← Dashboard
│   │   ├── clients/           ← Client list, create, detail
│   │   ├── projects/[id]/     ← Project detail
│   │   └── admin/users/       ← Admin user list
│   └── api/
│       ├── auth/[...nextauth] ← NextAuth handlers
│       └── uploads/           ← File upload + streaming
├── actions/                   ← Server Actions (mutations)
│   ├── clients.ts
│   ├── projects.ts
│   ├── transactions.ts
│   └── uploads.ts
├── components/
│   ├── ui/                    ← shadcn/ui components
│   ├── layout/                ← Sidebar, Header
│   ├── auth/                  ← LoginForm
│   ├── clients/               ← ClientForm, ClientSearch
│   ├── transactions/          ← LedgerTable, AddAdvanceModal, AddExpenseModal
│   └── projects/              ← ProjectForm
├── lib/
│   ├── prisma.ts              ← Singleton Prisma client
│   ├── auth.ts                ← NextAuth v5 config
│   ├── session.ts             ← Session helpers + role guards
│   ├── balance.ts             ← Balance computation utilities
│   ├── schemas.ts             ← Zod validation schemas
│   └── utils.ts               ← cn() helper
└── middleware.ts               ← Auth + route protection
```

---

## Architecture Notes

### Ledger Rules
- `amount` is always stored **positive** in the database
- Signed effect is derived from `type`:
  - `ADVANCE`, `PAYMENT` → **+amount** (money in from client)
  - `EXPENSE`, `REFUND` → **–amount** (money out)
  - `ADJUSTMENT` → uses `direction: IN | OUT` field
- Balance = computed at query time, never stored as a column

### Balance Prevention
- Normal users (USER role): expense is **blocked** if it would drop balance below 0
- Admins: can check "Negatif bakiye izni" checkbox to override

### File Upload Flow
1. User selects file in AddExpenseModal
2. Frontend `fetch` → `POST /api/uploads/upload` → file saved to disk → metadata returned
3. On form submit → `createExpense` server action → Attachment records created inline with transaction
4. File served via `GET /api/uploads/[key]` with auth check

### Server Actions vs Route Handlers
All mutations use **Server Actions** (co-located with components, type-safe, automatic CSRF protection).
Route Handlers are used only for:
- NextAuth auth endpoint (`/api/auth/[...nextauth]`)
- File upload (`POST /api/uploads/upload`)
- File streaming (`GET /api/uploads/[key]`)

### Authorization
- **Middleware** (`src/middleware.ts`): redirects unauthenticated users to `/login`
- **Server Actions**: every action calls `requireSession()` and checks ownership
- **ADMIN**: sees all clients/projects/transactions
- **USER**: sees only records they created (`createdById = session.user.id`)

---

## Production Considerations

1. **File Storage**: Replace local `/uploads` with S3/R2:
   - Update `POST /api/uploads/upload` to use AWS SDK
   - Update `GET /api/uploads/[key]` to generate signed URLs
   - Set env vars: `AWS_BUCKET`, `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`

2. **Database**: Use a managed PostgreSQL service (Railway, Supabase, Neon)

3. **Session Secret**: Generate a secure `NEXTAUTH_SECRET`:
   ```bash
   openssl rand -base64 32
   ```

4. **Multi-currency Precision**: `Decimal(18,4)` in Prisma handles financial precision correctly

5. **Adding shadcn/ui components**: If you need more components:
   ```bash
   npx shadcn-ui@latest add <component-name>
   ```

---

## Critical Notes & Caveats

1. **`attachmentMeta` two-phase upload**: Files are uploaded to disk first, then Attachment records are created atomically with the transaction. If the transaction creation fails, orphaned files on disk are possible — implement a cleanup cron in production.

2. **`date-fns` import**: Uses named imports (`startOfMonth`, `format`, etc.) — ensure tree-shaking works.

3. **NextAuth v5 beta**: Uses `next-auth@5.0.0-beta.x` — the `auth()` function is used instead of `getServerSession()`.

4. **Prisma Decimal**: Use `@prisma/client/runtime/library` to import `Decimal` for arithmetic. Never use JavaScript `Number` for monetary calculations.

5. **`forceNegative`**: Only stored as `true` when `isAdmin && forceNegative` — extra safety layer.
