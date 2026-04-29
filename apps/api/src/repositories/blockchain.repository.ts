import {
  BlockchainEntityType,
  BlockchainRecordType,
  BlockchainSyncStatus,
  Prisma,
} from "../db/prisma-client.js";
import { prisma } from "../db/prisma.js";

export const blockchainRepository = {
  create(data: Prisma.BlockchainRecordUncheckedCreateInput) {
    return prisma.blockchainRecord.create({ data });
  },

  listByEntity(entityType: BlockchainEntityType, entityId: string) {
    return prisma.blockchainRecord.findMany({
      where: { entityType, entityId },
      orderBy: [{ verifiedAt: "desc" }, { createdAt: "desc" }],
    });
  },

  findLatestForEntity(
    entityType: BlockchainEntityType,
    entityId: string,
    recordType?: BlockchainRecordType
  ) {
    return prisma.blockchainRecord.findFirst({
      where: { entityType, entityId, recordType },
      orderBy: [{ verifiedAt: "desc" }, { createdAt: "desc" }],
    });
  },

  findPendingRecords(limit = 25) {
    return prisma.blockchainRecord.findMany({
      where: { status: BlockchainSyncStatus.PENDING },
      orderBy: { createdAt: "asc" },
      take: limit,
    });
  },

  updateStatus(
    id: string,
    data: Pick<
      Prisma.BlockchainRecordUncheckedUpdateInput,
      | "status"
      | "txHash"
      | "blockNumber"
      | "contractAddress"
      | "chainId"
      | "walletAddress"
      | "proofPayload"
      | "syncedAt"
      | "verifiedAt"
      | "lastError"
    >
  ) {
    return prisma.blockchainRecord.update({
      where: { id },
      data,
    });
  },
};
