// prisma/seed.ts
import { PrismaClient, Role, TransactionType, ExpenseCategory, PaymentMethod } from '@prisma/client'
import bcrypt from 'bcryptjs'
import fs from 'fs'
import path from 'path'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // ── Users ────────────────────────────────────────────────────────────────
  const adminHash = await bcrypt.hash('Admin123!', 12)
  const userHash  = await bcrypt.hash('User123!', 12)

  const admin = await prisma.user.upsert({
    where: { email: 'admin@office.local' },
    update: {},
    create: {
      email: 'admin@office.local',
      name: 'Admin User',
      passwordHash: adminHash,
      role: Role.ADMIN,
    },
  })

  const user = await prisma.user.upsert({
    where: { email: 'user@office.local' },
    update: {},
    create: {
      email: 'user@office.local',
      name: 'Normal User',
      passwordHash: userHash,
      role: Role.USER,
    },
  })

  // ── Client ───────────────────────────────────────────────────────────────
  const client = await prisma.client.upsert({
    where: { id: 'seed-client-1' },
    update: {},
    create: {
      id: 'seed-client-1',
      name: 'Ahmet Yılmaz',
      phone: '+90 555 123 4567',
      email: 'ahmet@example.com',
      taxId: '12345678901',
      createdById: admin.id,
    },
  })

  // ── Project ──────────────────────────────────────────────────────────────
  const project = await prisma.project.upsert({
    where: { clientId_fileNo: { clientId: client.id, fileNo: '2024/001' } },
    update: {},
    create: {
      fileNo: '2024/001',
      title: 'İş Davası - İstanbul',
      description: 'İstanbul 3. İş Mahkemesi dosyası',
      clientId: client.id,
      createdById: admin.id,
    },
  })

  // ── Advance (+5000 TRY) ──────────────────────────────────────────────────
  const advance = await prisma.ledgerTransaction.create({
    data: {
      type: TransactionType.ADVANCE,
      amount: 5000,
      currency: 'TRY',
      date: new Date('2024-01-15'),
      description: 'İlk avans ödemesi',
      clientId: client.id,
      projectId: project.id,
      createdById: admin.id,
    },
  })

  // ── Create placeholder attachment file ────────────────────────────────────
  const uploadsDir = path.join(process.cwd(), 'uploads')
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true })

  const placeholderKey = 'seed/receipt-placeholder.txt'
  const placeholderPath = path.join(uploadsDir, 'seed', 'receipt-placeholder.txt')
  if (!fs.existsSync(path.dirname(placeholderPath))) {
    fs.mkdirSync(path.dirname(placeholderPath), { recursive: true })
  }
  fs.writeFileSync(placeholderPath, 'Bu dosya seed verisi için oluşturulmuş örnek bir makbuz dosyasıdır.')

  // ── Expense (-1200 TRY) with attachment ───────────────────────────────────
  const expense = await prisma.ledgerTransaction.create({
    data: {
      type: TransactionType.EXPENSE,
      amount: 1200,
      currency: 'TRY',
      date: new Date('2024-01-20'),
      description: 'Mahkeme harcı',
      category: ExpenseCategory.COURT_FEES,
      paymentMethod: PaymentMethod.TRANSFER,
      vatIncluded: false,
      vatRate: 0,
      invoiced: true,
      invoiceNo: 'INV-2024-001',
      clientId: client.id,
      projectId: project.id,
      createdById: admin.id,
      attachments: {
        create: {
          originalName: 'receipt-placeholder.txt',
          storageKey: placeholderKey,
          mimeType: 'text/plain',
          sizeBytes: 70,
        },
      },
    },
  })

  // ── Refund (-500 TRY) ────────────────────────────────────────────────────
  const refund = await prisma.ledgerTransaction.create({
    data: {
      type: TransactionType.REFUND,
      amount: 500,
      currency: 'TRY',
      date: new Date('2024-02-01'),
      description: 'Kısmi iade',
      clientId: client.id,
      projectId: project.id,
      createdById: admin.id,
    },
  })

  console.log('✅ Seed tamamlandı!')
  console.log(`   Admin : admin@office.local / Admin123!`)
  console.log(`   User  : user@office.local / User123!`)
  console.log(`   Müvekkil : ${client.name} (${client.id})`)
  console.log(`   Proje    : ${project.fileNo} - ${project.title}`)
  console.log(`   Avans    : +5.000 TRY (id: ${advance.id})`)
  console.log(`   Harcama  : -1.200 TRY (id: ${expense.id})`)
  console.log(`   İade     : -  500 TRY (id: ${refund.id})`)
  console.log(`   Kalan bakiye: 3.300 TRY`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
