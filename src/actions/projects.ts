// src/actions/projects.ts
"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { requireSession } from "@/lib/session"
import { requireCurrentUser } from "@/lib/current-user"
import { projectSchema } from "@/lib/schemas"
import type { ActionResult } from "./clients"
import { logAudit } from "@/lib/audit"

export async function createProject(formData: FormData): Promise<ActionResult<{ id: string }>> {
  // Login zorunlu (redirect eder)
  await requireSession()

  // ✅ Real DB user (cuid) – createdById için tek doğru kaynak
  const dbUser = await requireCurrentUser()

  const raw = {
    clientId: formData.get("clientId"),
    fileNo: formData.get("fileNo"),
    title: formData.get("title"),
    description: (formData.get("description") as string) || undefined,
  }

  const parsed = projectSchema.safeParse(raw)
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? "Geçersiz veri." }
  }

  // All authenticated users can create projects for any client
  const client = await prisma.client.findUnique({ where: { id: parsed.data.clientId } })
  if (!client) return { success: false, error: "Müvekkil bulunamadı." }

  try {
    const project = await prisma.project.create({
      data: {
        ...parsed.data,
        description: parsed.data.description ?? null,
        createdById: dbUser.id, // ✅ REAL USER ID
      },
      select: { id: true, clientId: true },
    })

    revalidatePath(`/clients/${project.clientId}`)
    await logAudit({ entityType: 'PROJECT', entityId: project.id, actionType: 'CREATE', newValues: { ...parsed.data }, performedById: dbUser.id })
    return { success: true, data: { id: project.id } }
  } catch (err: any) {
    // 🔎 Daha iyi log (terminalde gerçek hata görünsün)
    console.error("createProject error:", err)

    const msg =
      typeof err?.message === "string" && err.message.toLowerCase().includes("unique constraint")
        ? "Bu dosya numarası zaten mevcut."
        : "Proje oluşturulamadı."

    return { success: false, error: msg }
  }
}

const projectUpdateSchema = projectSchema.omit({ clientId: true })

export async function updateProject(
  id: string,
  raw: unknown
): Promise<ActionResult<{ id: string }>> {
  const parsed = projectUpdateSchema.safeParse(raw)
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? "Geçersiz veri." }
  }

  try {
    const user = await requireCurrentUser()
    const isAdmin = user.role === "ADMIN"

    const existing = await prisma.project.findUnique({ where: { id } })
    if (!existing) return { success: false, error: "Proje bulunamadı." }

    if (!isAdmin && existing.createdById !== user.id) {
      return { success: false, error: "Bu projeyi düzenleme yetkiniz yok." }
    }

    const updated = await prisma.project.update({
      where: { id },
      data: {
        fileNo: parsed.data.fileNo,
        title: parsed.data.title,
        description: parsed.data.description ?? null,
      },
    })

    await logAudit({
      entityType: "PROJECT",
      entityId: id,
      actionType: "UPDATE",
      oldValues: existing,
      newValues: updated,
      performedById: user.id,
    })

    revalidatePath(`/projects/${id}`)
    revalidatePath(`/clients/${existing.clientId}`)
    return { success: true, data: { id } }
  } catch (err: any) {
    console.error("updateProject error:", err)
    const msg =
      typeof err?.message === "string" && err.message.toLowerCase().includes("unique constraint")
        ? "Bu dosya numarası zaten mevcut."
        : "Proje güncellenemedi."
    return { success: false, error: msg }
  }
}

export async function toggleProjectClosed(id: string): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireCurrentUser()
    if (user.role !== "ADMIN") return { success: false, error: "Bu işlem için yetkiniz yok." }

    const existing = await prisma.project.findUnique({ where: { id } })
    if (!existing) return { success: false, error: "Proje bulunamadı." }

    const updated = await prisma.project.update({
      where: { id },
      data: { closedAt: existing.closedAt ? null : new Date() },
    })

    await logAudit({
      entityType: "PROJECT",
      entityId: id,
      actionType: "UPDATE",
      oldValues: { closedAt: existing.closedAt },
      newValues: { closedAt: updated.closedAt },
      performedById: user.id,
    })

    revalidatePath(`/projects/${id}`)
    revalidatePath(`/clients/${existing.clientId}`)
    return { success: true, data: { id } }
  } catch (err: any) {
    console.error("toggleProjectClosed error:", err)
    return { success: false, error: "Proje durumu güncellenemedi." }
  }
}

export async function deleteProject(id: string): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireCurrentUser()
    if (user.role !== "ADMIN") return { success: false, error: "Bu işlem için yetkiniz yok." }

    const existing = await prisma.project.findUnique({
      where: { id },
      include: { _count: { select: { transactions: true } } },
    })
    if (!existing) return { success: false, error: "Proje bulunamadı." }

    if ((existing as any)._count.transactions > 0) {
      return {
        success: false,
        error: `Bu projeye ait ${(existing as any)._count.transactions} işlem var. Önce işlemleri silin.`,
      }
    }

    await prisma.project.delete({ where: { id } })

    await logAudit({
      entityType: "PROJECT",
      entityId: id,
      actionType: "DELETE",
      oldValues: existing,
      performedById: user.id,
    })

    revalidatePath(`/clients/${existing.clientId}`)
    revalidatePath("/projects")
    return { success: true, data: { id } }
  } catch (err: any) {
    console.error("deleteProject error:", err)
    return { success: false, error: "Proje silinemedi." }
  }
}

export async function getProjectById(id: string) {
  await requireSession()
  await requireCurrentUser()

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      client: true,
      createdBy: { select: { id: true, name: true } },
    },
  })

  if (!project) return null
  return project
}