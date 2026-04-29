import { BlockchainEntityType, BlockchainSyncStatus, Prisma } from "../../db/prisma-client.js";
import { auditRepository } from "../../repositories/audit.repository.js";
import { prisma } from "../../db/prisma.js";

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

    const propertyIds = Array.from(
      new Set(logs.map((log) => log.propertyId).filter((value): value is string => Boolean(value)))
    );
    const tradeIds = Array.from(
      new Set(logs.map((log) => log.tradeId).filter((value): value is string => Boolean(value)))
    );

    const [properties, trades, propertyRecords, tradeRecords] = await Promise.all([
      propertyIds.length
        ? prisma.property.findMany({
            where: { id: { in: propertyIds } },
            select: {
              id: true,
              verificationStatus: true,
              blockchainTxHash: true,
            },
          })
        : [],
      tradeIds.length
        ? prisma.trade.findMany({
            where: { id: { in: tradeIds } },
            select: {
              id: true,
              verificationStatus: true,
              blockchainTxHash: true,
            },
          })
        : [],
      propertyIds.length
        ? prisma.blockchainRecord.findMany({
            where: {
              entityType: BlockchainEntityType.PROPERTY,
              entityId: { in: propertyIds },
            },
            orderBy: [{ verifiedAt: "desc" }, { createdAt: "desc" }],
          })
        : [],
      tradeIds.length
        ? prisma.blockchainRecord.findMany({
            where: {
              entityType: BlockchainEntityType.TRADE,
              entityId: { in: tradeIds },
            },
            orderBy: [{ verifiedAt: "desc" }, { createdAt: "desc" }],
          })
        : [],
    ]);

    const propertyMap = new Map(properties.map((item) => [item.id, item]));
    const tradeMap = new Map(trades.map((item) => [item.id, item]));

    function rankRecordStatus(status: BlockchainSyncStatus) {
      switch (status) {
        case BlockchainSyncStatus.CONFIRMED:
          return 3;
        case BlockchainSyncStatus.PENDING:
          return 2;
        case BlockchainSyncStatus.SKIPPED:
          return 1;
        case BlockchainSyncStatus.FAILED:
        default:
          return 0;
      }
    }

    function buildLatestRecordMap(
      records: Awaited<ReturnType<typeof prisma.blockchainRecord.findMany>>
    ) {
      const map = new Map<string, (typeof records)[number]>();

      for (const record of records) {
        const current = map.get(record.entityId);
        if (!current) {
          map.set(record.entityId, record);
          continue;
        }

        const rankDiff = rankRecordStatus(record.status) - rankRecordStatus(current.status);
        if (rankDiff > 0) {
          map.set(record.entityId, record);
          continue;
        }

        if (rankDiff === 0 && record.createdAt > current.createdAt) {
          map.set(record.entityId, record);
        }
      }

      return map;
    }

    const propertyRecordMap = buildLatestRecordMap(propertyRecords);
    const tradeRecordMap = buildLatestRecordMap(tradeRecords);

    return {
      total,
      items: logs.map((log) => ({
        ...(function buildProofData() {
          const property = log.propertyId ? propertyMap.get(log.propertyId) : null;
          const trade = log.tradeId ? tradeMap.get(log.tradeId) : null;
          const propertyRecord = log.propertyId ? propertyRecordMap.get(log.propertyId) : null;
          const tradeRecord = log.tradeId ? tradeRecordMap.get(log.tradeId) : null;

          return {
            propertyProof: property
              ? {
                  verificationStatus: property.verificationStatus,
                  blockchainRef: propertyRecord?.txHash ?? property.blockchainTxHash ?? null,
                  latestRecordStatus: propertyRecord?.status ?? null,
                  contractAddress: propertyRecord?.contractAddress ?? null,
                }
              : null,
            tradeProof: trade
              ? {
                  verificationStatus: trade.verificationStatus,
                  blockchainRef: tradeRecord?.txHash ?? trade.blockchainTxHash ?? null,
                  latestRecordStatus: tradeRecord?.status ?? null,
                  contractAddress: tradeRecord?.contractAddress ?? null,
                }
              : null,
          };
        })(),
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
      })),
    };
  },
};
