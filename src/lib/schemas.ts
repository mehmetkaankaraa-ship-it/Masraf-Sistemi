// src/lib/schemas.ts
import { z } from 'zod'

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

export const amountField = z
  .union([z.string(), z.number()])
  .transform((v) => (typeof v === 'string' ? Number(v) : v))
  .refine((n) => Number.isFinite(n) && n > 0, 'Tutar geçersiz.')

export const dateField = z
  .string()
  .min(1, 'Tarih zorunlu.')
  // HTML date input => "YYYY-MM-DD"
  .refine((s) => !Number.isNaN(new Date(s).getTime()), 'Tarih geçersiz.')

export const optionalProjectId = z.union([z.string().cuid(), z.literal(''), z.null(), z.undefined()]).optional()

// Upload meta that /api/uploads should return
export const attachmentMetaSchema = z.object({
  originalName: z.string().min(1),
  storageKey: z.string().min(1),
  mimeType: z.string().min(1),
  sizeBytes: z
    .union([z.number(), z.string()])
    .transform((v) => (typeof v === 'string' ? Number(v) : v))
    .refine((n) => Number.isFinite(n) && n >= 0),
})

// ─────────────────────────────────────────────────────────────────────────────
// Client
// ─────────────────────────────────────────────────────────────────────────────

export const clientSchema = z.object({
  name: z.string().min(2, 'Ad Soyad / Şirket adı zorunlu.'),
  phone: z.string().optional(),
  email: z.string().email('E-posta geçersiz.').optional().or(z.literal('')),
  taxId: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
})

// ─────────────────────────────────────────────────────────────────────────────
// Project
// ─────────────────────────────────────────────────────────────────────────────

export const projectSchema = z.object({
  clientId: z.string().cuid(),
  fileNo: z.string().min(1, 'Dosya numarası zorunlu'),
  title: z.string().min(2, 'Başlık en az 2 karakter olmalı'),
  description: z.string().optional(),
})

// ─────────────────────────────────────────────────────────────────────────────
// Transactions (Sade yapı)
// ─────────────────────────────────────────────────────────────────────────────

// Avans: proje opsiyonel
export const advanceSchema = z.object({
  clientId: z.string().cuid(),
  projectId: optionalProjectId,
  amount: amountField,
  date: dateField,
  description: z.string().optional(),
})

// Harcama: proje ZORUNLU + opsiyonel açıklama + opsiyonel dosya ekleri
export const expenseSchema = z.object({
  clientId: z.string().cuid(),
  projectId: z.string().cuid({ message: 'Harcama için proje seçmek zorunlu.' }),
  amount: amountField,
  date: dateField,
  description: z.string().optional(),
  attachmentMeta: z.array(attachmentMetaSchema).default([]),

  // Eski alanlar vardıysa diye geriye dönük uyumluluk:
  // UI göndermese bile parse bozulmasın diye optional bırakıyoruz.
  category: z.any().optional(),
  paymentMethod: z.any().optional(),
  vatIncluded: z.any().optional(),
  vatRate: z.any().optional(),
  invoiceNo: z.any().optional(),
  invoiced: z.any().optional(),
  forceNegative: z.any().optional(),
})

// İade: proje opsiyonel
export const refundSchema = z.object({
  clientId: z.string().cuid(),
  projectId: optionalProjectId,
  amount: amountField,
  date: dateField,
  description: z.string().optional(),
  forceNegative: z.coerce.boolean().default(false),
})

// Listeleme filtresi (transactions list)
export const ledgerFilterSchema = z.object({
  clientId: z.string().cuid().optional(),
  projectId: optionalProjectId,
  type: z.enum(['ADVANCE', 'EXPENSE', 'REFUND', '']).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  search: z.string().optional(),
  createdById: z.string().optional(), // admin-only filter

  page: z
    .union([z.string(), z.number()])
    .optional()
    .transform((v) => (v === undefined ? 1 : typeof v === 'string' ? Number(v) : v))
    .refine((n) => Number.isFinite(n) && n >= 1)
    .default(1),

  pageSize: z
    .union([z.string(), z.number()])
    .optional()
    .transform((v) => (v === undefined ? 20 : typeof v === 'string' ? Number(v) : v))
    .refine((n) => Number.isFinite(n) && n >= 1 && n <= 200)
    .default(20),
})

export const updateTransactionSchema = z.object({
  id: z.string().cuid(),
  clientId: z.string().cuid(),

  // ortak alanlar
  amount: amountField,
  date: dateField,
  description: z.string().optional(),

  // EXPENSE için
  projectId: optionalProjectId,
  category: z.any().optional(),
  paymentMethod: z.any().optional(),
  vatIncluded: z.any().optional(),
  vatRate: z.any().optional(),
  invoiceNo: z.any().optional(),
  invoiced: z.any().optional(),

  // yeni belge eklemek istersek
  attachmentMeta: z.array(attachmentMetaSchema).default([]),
})