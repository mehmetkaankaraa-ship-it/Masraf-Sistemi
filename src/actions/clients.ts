// src/actions/clients.ts
"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { clientSchema } from "@/lib/schemas";
import { requireCurrentUser } from "@/lib/current-user";
import { logAudit } from "@/lib/audit";

export type ActionResult<T = { id: string }> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * List ALL clients (shared firm pool).
 */
export async function getClients(q?: string) {
  await requireCurrentUser();
  const query = (q ?? "").trim();

  return prisma.client.findMany({
    where: {
      ...(query
        ? {
            OR: [
              { name: { contains: query, mode: "insensitive" } },
              { email: { contains: query, mode: "insensitive" } },
              { phone: { contains: query, mode: "insensitive" } },
              { taxId: { contains: query, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      taxId: true,
      createdAt: true,
      createdBy: { select: { id: true, name: true } },
      _count: {
        select: {
          projects: true,
          transactions: true,
        },
      },
    },
  });
}

/**
 * Detail any client (shared firm pool).
 */
export async function getClientById(id: string) {
  await requireCurrentUser();

  return prisma.client.findFirst({
    where: { id },
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      taxId: true,
      address: true,
      notes: true,
      createdAt: true,
      updatedAt: true,
      createdBy: { select: { id: true, name: true } },
      _count: {
        select: {
          projects: true,
          transactions: true,
        },
      },
      projects: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          fileNo: true,
          title: true,
          description: true,
          closedAt: true,
          createdAt: true,
        },
      },
    },
  });
}

export async function createClient(raw: unknown): Promise<ActionResult> {
  const parsed = clientSchema.safeParse(raw);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.errors[0]?.message ?? "Geçersiz veri.",
    };
  }

  try {
    const user = await requireCurrentUser();

    const client = await prisma.client.create({
      data: {
        name: parsed.data.name,
        phone: parsed.data.phone ?? null,
        email: parsed.data.email ?? null,
        taxId: parsed.data.taxId ?? null,
        address: parsed.data.address ?? null,
        notes: parsed.data.notes ?? null,
        createdById: user.id,
      },
    });

    await logAudit({
      entityType: "CLIENT",
      entityId: client.id,
      actionType: "CREATE",
      newValues: client,
      performedById: user.id,
    });

    revalidatePath("/clients");
    return { success: true, data: { id: client.id } };
  } catch (err: any) {
    if (err?.message === "UNAUTHORIZED") {
      return { success: false, error: "Oturum bulunamadı. Lütfen tekrar giriş yapın." };
    }
    console.error("createClient error:", err);
    return { success: false, error: "Müvekkil oluşturulamadı." };
  }
}

export async function updateClient(id: string, raw: unknown): Promise<ActionResult> {
  const parsed = clientSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? "Geçersiz veri." };
  }

  try {
    const user = await requireCurrentUser();
    const isAdmin = user.role === "ADMIN";

    const existing = await prisma.client.findUnique({ where: { id } });
    if (!existing) return { success: false, error: "Müvekkil bulunamadı." };

    if (!isAdmin && existing.createdById !== user.id) {
      return { success: false, error: "Bu müvekkili düzenleme yetkiniz yok." };
    }

    const updated = await prisma.client.update({
      where: { id },
      data: {
        name: parsed.data.name,
        phone: parsed.data.phone ?? null,
        email: parsed.data.email ?? null,
        taxId: parsed.data.taxId ?? null,
        address: parsed.data.address ?? null,
        notes: parsed.data.notes ?? null,
      },
    });

    await logAudit({
      entityType: "CLIENT",
      entityId: id,
      actionType: "UPDATE",
      oldValues: existing,
      newValues: updated,
      performedById: user.id,
    });

    revalidatePath("/clients");
    revalidatePath(`/clients/${id}`);
    return { success: true, data: { id } };
  } catch (err: any) {
    console.error("updateClient error:", err);
    return { success: false, error: "Müvekkil güncellenemedi." };
  }
}

export async function deleteClient(id: string): Promise<ActionResult> {
  try {
    const user = await requireCurrentUser();
    if (user.role !== "ADMIN") {
      return { success: false, error: "Bu işlem için yetkiniz yok." };
    }

    const existing = await prisma.client.findUnique({ where: { id } });
    if (!existing) return { success: false, error: "Müvekkil bulunamadı." };

    await prisma.client.delete({ where: { id } });

    await logAudit({
      entityType: "CLIENT",
      entityId: id,
      actionType: "DELETE",
      oldValues: existing,
      performedById: user.id,
    });

    revalidatePath("/clients");
    return { success: true, data: { id } };
  } catch (err: any) {
    console.error("deleteClient error:", err);
    return { success: false, error: "Müvekkil silinemedi." };
  }
}
