import { Prisma } from "@prisma/client";
import { auditRepository } from "../../repositories/audit.repository.js";

function buildActorLabel(log: {
  actorType: string;
  actorUser: { email: string | null; phone?: string | null; id: string; role: string } | null;
}) {
  if (!log.actorUser) {
    return log.actorType;
  }

  return `${log.actorUser.email || log.actorUser.phone || log.actorUser.id} (${log.actorUser.role})`;
}

function buildSummary(log: {
  action: string;
  entityType: string;
  entityId: string | null;
  propertyId: string | null;
  tradeId: string | null;
}) {
  const subject = log.entityId ? `${log.entityType} ${log.entityId}` : log.entityType;
  const refs = [log.propertyId ? `property ${log.propertyId}` : null, log.tradeId ? `trade ${log.tradeId}` : null]
    .filter(Boolean)
    .join(", ");

  return refs ? `${log.action} ${subject} (${refs})` : `${log.action} ${subject}`;
}

export const auditService = {
  async list(
    filters: { action?: string; actorType?: string; entityType?: string },
    pagination: { skip: number; take: number; page: number; pageSize: number }
  ) {
    const where: Prisma.AdminAuditLogWhereInput = {
      action: (filters.action as any) || undefined,
      actorType: (filters.actorType as any) || undefined,
      entityType: filters.entityType || undefined,
    };

    const [total, logs] = await Promise.all([
      auditRepository.count(where),
      auditRepository.findMany(where, pagination.skip, pagination.take),
    ]);

    return {
      total,
      items: logs.map((log) => ({
        id: log.id,
        actorType: log.actorType,
        actorLabel: buildActorLabel(log),
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        targetUserId: log.targetUserId,
        propertyId: log.propertyId,
        tradeId: log.tradeId,
        metadata: log.metadata,
        createdAt: log.createdAt,
        actorUser: log.actorUser,
        summary: buildSummary(log),
        // PHASE_3_BLOCKCHAIN: ownership settlement confirmations can append
        // verified transfer references into audit metadata without changing this shape.
      })),
    };
  },
};
