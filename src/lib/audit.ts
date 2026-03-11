// src/lib/audit.ts
import { prisma } from "@/lib/prisma";
import type { AuditEntityType, AuditActionType } from "@prisma/client";

interface LogAuditParams {
  entityType: AuditEntityType;
  entityId: string;
  actionType: AuditActionType;
  oldValues?: object | null;
  newValues?: object | null;
  performedById: string;
}

export async function logAudit(params: LogAuditParams) {
  try {
    await prisma.auditLog.create({
      data: {
        entityType: params.entityType,
        entityId: params.entityId,
        actionType: params.actionType,
        oldValues: params.oldValues ? JSON.parse(JSON.stringify(params.oldValues)) : undefined,
        newValues: params.newValues ? JSON.parse(JSON.stringify(params.newValues)) : undefined,
        performedById: params.performedById,
      },
    });
  } catch (err) {
    // Audit logging must never break main flows
    console.error("Audit log error:", err);
  }
}
