import {
  BlockchainEntityType,
  BlockchainRecordType,
  BlockchainSyncStatus,
  Prisma,
  UserRole,
  VerificationStatus,
} from "../../db/prisma-client.js";
import { createHash } from "node:crypto";
import { prisma } from "../../db/prisma.js";
import { propertyRepository } from "../../repositories/property.repository.js";
import { blockchainRepository } from "../../repositories/blockchain.repository.js";
import { transactionRepository } from "../../repositories/transaction.repository.js";
import { ApiError } from "../../shared/http/apiError.js";
import { createBlockchainProvider } from "./providers/provider-factory.js";
import type {
  RecordOwnershipProofInput,
  RecordTransferProofInput,
  TransactionAccessContext,
  VerificationRecordView,
  VerificationSnapshot,
} from "./types.js";

const provider = createBlockchainProvider();
let proofWriteQueue: Promise<unknown> = Promise.resolve();

function deriveDemoWallet(seed: string) {
  const digest = createHash("sha256").update(seed).digest("hex");
  return `0x${digest.slice(0, 40)}`;
}

function mapRecord(
  record: Awaited<ReturnType<typeof blockchainRepository.listByEntity>>[number]
): VerificationRecordView {
  return {
    id: record.id,
    recordType: record.recordType,
    status: record.status,
    txHash: record.txHash ?? null,
    blockNumber: record.blockNumber ?? null,
    walletAddress: record.walletAddress ?? null,
    contractAddress: record.contractAddress ?? null,
    verifiedAt: record.verifiedAt?.toISOString() ?? null,
    createdAt: record.createdAt.toISOString(),
  };
}

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

function getPreferredRecord(records: VerificationRecordView[]) {
  return [...records].sort((left, right) => {
    const rankDiff = rankRecordStatus(right.status) - rankRecordStatus(left.status);
    if (rankDiff !== 0) {
      return rankDiff;
    }

    return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
  })[0] ?? null;
}

function buildSnapshot(input: {
  entityType: BlockchainEntityType;
  entityId: string;
  verificationStatus: string;
  blockchainRef: string | null;
  records: Awaited<ReturnType<typeof blockchainRepository.listByEntity>>;
  note: string;
}): VerificationSnapshot {
  const runtime = provider.getRuntimeConfig();
  const records = input.records
    .map(mapRecord)
    .sort((left, right) => {
      const rankDiff = rankRecordStatus(right.status) - rankRecordStatus(left.status);
      if (rankDiff !== 0) {
        return rankDiff;
      }

      return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
    });
  const preferredRecord = getPreferredRecord(records);
  const verificationStatus =
    preferredRecord?.status === BlockchainSyncStatus.CONFIRMED
      ? VerificationStatus.VERIFIED
      : input.verificationStatus;
  const blockchainRef = preferredRecord?.txHash ?? input.blockchainRef;

  return {
    entityType: input.entityType,
    entityId: input.entityId,
    verificationStatus,
    blockchainRef,
    blockchainEnabled: runtime.enabled,
    provider: runtime.provider,
    providerStatus: provider.status,
    network: runtime.network,
    chainId: runtime.chainId,
    contractAddress: runtime.contractAddress,
    latestRecord: preferredRecord,
    records,
    note: input.note,
  };
}

function runQueuedProofWrite<T>(task: () => Promise<T>) {
  const next = proofWriteQueue.then(task, task);
  proofWriteQueue = next.then(
    () => undefined,
    () => undefined
  );
  return next;
}

async function persistRecord(input: {
  entityType: BlockchainEntityType;
  entityId: string;
  recordType: BlockchainRecordType;
  ownerUserId?: string | null;
  propertyId?: string | null;
  tradeId?: string | null;
  buyOrderId?: string | null;
  sellOrderId?: string | null;
  documentId?: string | null;
  txHash?: string | null;
  walletAddress?: string | null;
  contractAddress?: string | null;
  blockNumber?: number | null;
  proofPayload?: Record<string, unknown> | null;
}) {
  let syncResult;

  if (input.recordType === BlockchainRecordType.OWNERSHIP_PROOF) {
    syncResult = await provider.issueShares({
      propertyId: input.propertyId ?? input.entityId,
      holderAddress:
        String(input.proofPayload?.holderAddress || input.walletAddress || "") || "",
      sharesOwned: Number(input.proofPayload?.sharesOwned || 0),
      metadata: {
        ...(input.proofPayload ?? {}),
        entityType: input.entityType,
        entityId: input.entityId,
        recordType: input.recordType,
      },
    });
  } else {
    syncResult = await provider.transferShares({
      propertyId: input.propertyId ?? input.entityId,
      fromAddress: String(input.proofPayload?.fromAddress || ""),
      toAddress: String(input.proofPayload?.toAddress || input.walletAddress || ""),
      sharesTransferred: Number(input.proofPayload?.sharesTransferred || 0),
      metadata: {
        ...(input.proofPayload ?? {}),
        entityType: input.entityType,
        entityId: input.entityId,
        recordType: input.recordType,
      },
    });
  }

  const now = new Date();

  const record = await blockchainRepository.create({
    entityType: input.entityType,
    entityId: input.entityId,
    recordType: input.recordType,
    status: syncResult.status,
    network: provider.getRuntimeConfig().network,
    chainId: syncResult.chainId,
    contractAddress: syncResult.contractAddress,
    txHash: syncResult.txHash,
    blockNumber: syncResult.blockNumber,
    walletAddress: syncResult.walletAddress,
    ownerUserId: input.ownerUserId ?? null,
    propertyId: input.propertyId ?? null,
    tradeId: input.tradeId ?? null,
    buyOrderId: input.buyOrderId ?? null,
    sellOrderId: input.sellOrderId ?? null,
    documentId: input.documentId ?? null,
    proofPayload: (syncResult.proofPayload as Prisma.InputJsonValue | undefined) ?? undefined,
    syncedAt: syncResult.status === BlockchainSyncStatus.SKIPPED ? null : now,
    verifiedAt: syncResult.status === BlockchainSyncStatus.CONFIRMED ? now : null,
    lastError: syncResult.status === BlockchainSyncStatus.FAILED ? syncResult.note : null,
  });

  return { record, syncResult };
}

async function ensureTransferSourceOwnership(trade: Awaited<ReturnType<typeof transactionRepository.findById>>) {
  if (!trade || provider.getRuntimeConfig().provider !== "hardhat-local") {
    return;
  }

  const shareClass = await prisma.shareClass.findUnique({
    where: { propertyId: trade.propertyId },
  });

  if (!shareClass) {
    throw new ApiError(400, "INVALID_STATE", "Property has no share class configured");
  }

  const sellerHolding = await prisma.holding.findUnique({
    where: {
      userId_shareClassId: {
        userId: trade.sellerUserId,
        shareClassId: shareClass.id,
      },
    },
  });

  const sellerWallet = deriveDemoWallet(`seller:${trade.sellerUserId}`);
  const sharesOwned = Math.max(sellerHolding?.sharesOwned ?? 0, trade.sharesTraded);

  const latestOwnershipRecord = await blockchainRepository.findLatestForEntity(
    BlockchainEntityType.PROPERTY,
    trade.propertyId,
    BlockchainRecordType.OWNERSHIP_PROOF
  );

  const latestHolderAddress =
    latestOwnershipRecord?.walletAddress ||
    String((latestOwnershipRecord?.proofPayload as Record<string, unknown> | null)?.holderAddress || "");
  const latestSharesOwned = Number(
    (latestOwnershipRecord?.proofPayload as Record<string, unknown> | null)?.sharesOwned || 0
  );

  if (
    latestOwnershipRecord?.status === BlockchainSyncStatus.CONFIRMED &&
    latestHolderAddress === sellerWallet &&
    latestSharesOwned >= trade.sharesTraded
  ) {
    return;
  }

  await persistRecord({
    entityType: BlockchainEntityType.PROPERTY,
    entityId: trade.propertyId,
    recordType: BlockchainRecordType.OWNERSHIP_PROOF,
    ownerUserId: trade.sellerUserId,
    propertyId: trade.propertyId,
    walletAddress: sellerWallet,
    proofPayload: {
      holderAddress: sellerWallet,
      sharesOwned,
      ownerUserId: trade.sellerUserId,
      propertyAddress: trade.property.address1,
      source: "auto-issued-before-transfer",
      tradeId: trade.id,
    },
  });
}

export const blockchainService = {
  status: provider.status,

  getRuntimeConfig() {
    return provider.getRuntimeConfig();
  },

  async getPropertyVerification(propertyId: string) {
    const property = await propertyRepository.findDetailById(propertyId);
    if (!property) {
      throw new ApiError(404, "NOT_FOUND", "Property not found");
    }

    const records = await blockchainRepository.listByEntity(
      BlockchainEntityType.PROPERTY,
      propertyId
    );

    return buildSnapshot({
      entityType: BlockchainEntityType.PROPERTY,
      entityId: propertyId,
      verificationStatus: property.verificationStatus,
      blockchainRef: property.blockchainTxHash ?? null,
      records,
      note: provider.getRuntimeConfig().enabled
        ? "Blockchain verification augments the operational property record."
        : "Blockchain verification is optional and currently disabled in this environment.",
    });
  },

  async getTransactionVerification(
    access: TransactionAccessContext,
    transactionId: string
  ) {
    const trade = await transactionRepository.findById(transactionId);
    if (!trade) {
      throw new ApiError(404, "NOT_FOUND", "Transaction not found");
    }

    if (
      access.role !== "ADMIN" &&
      trade.buyerUserId !== access.userId &&
      trade.sellerUserId !== access.userId
    ) {
      throw new ApiError(403, "FORBIDDEN", "Not allowed to view this transaction");
    }

    const records = await blockchainRepository.listByEntity(
      BlockchainEntityType.TRADE,
      transactionId
    );

    return buildSnapshot({
      entityType: BlockchainEntityType.TRADE,
      entityId: transactionId,
      verificationStatus: trade.verificationStatus,
      blockchainRef: trade.blockchainTxHash ?? null,
      records,
      note: provider.getRuntimeConfig().enabled
        ? "Transfer verification is recorded as an audit layer on top of the trade ledger."
        : "Blockchain verification is optional and currently disabled in this environment.",
    });
  },

  async recordOwnershipProof(input: RecordOwnershipProofInput) {
    return runQueuedProofWrite(async () => {
      const property = await propertyRepository.findDetailById(input.propertyId);
      if (!property) {
        throw new ApiError(404, "NOT_FOUND", "Property not found");
      }

      if (!property.shareClass) {
        throw new ApiError(400, "INVALID_STATE", "Property has no share class configured");
      }

      const ownerUserId = input.ownerUserId ?? null;
      const holding = ownerUserId
        ? await prisma.holding.findUnique({
            where: {
              userId_shareClassId: {
                userId: ownerUserId,
                shareClassId: property.shareClass.id,
              },
            },
          })
        : null;

      const holderAddress =
        input.walletAddress ??
        (ownerUserId ? deriveDemoWallet(`owner:${ownerUserId}`) : deriveDemoWallet(`property:${property.id}`));
      const sharesOwned =
        holding?.sharesOwned ??
        property.shareClass.totalShares;

      const { syncResult } = await persistRecord({
        entityType: BlockchainEntityType.PROPERTY,
        entityId: property.id,
        recordType: BlockchainRecordType.OWNERSHIP_PROOF,
        ownerUserId,
        propertyId: property.id,
        txHash: input.txHash ?? null,
        walletAddress: holderAddress,
        contractAddress: input.contractAddress ?? null,
        blockNumber: input.blockNumber ?? null,
        proofPayload: {
          ...(input.proofPayload ?? {}),
          holderAddress,
          sharesOwned,
          ownerUserId,
          propertyAddress: property.address1,
        },
      });

      await prisma.property.update({
        where: { id: property.id },
        data: {
          verificationStatus:
            syncResult.status === BlockchainSyncStatus.CONFIRMED
              ? VerificationStatus.VERIFIED
              : property.verificationStatus,
          blockchainTxHash: syncResult.txHash ?? property.blockchainTxHash ?? null,
        },
      });

      return this.getPropertyVerification(property.id);
    });
  },

  async recordTransferProof(input: RecordTransferProofInput) {
    return runQueuedProofWrite(async () => {
      const trade = await transactionRepository.findById(input.transactionId);
      if (!trade) {
        throw new ApiError(404, "NOT_FOUND", "Transaction not found");
      }

      await ensureTransferSourceOwnership(trade);

      const buyerWallet =
        input.walletAddress ?? deriveDemoWallet(`buyer:${trade.buyerUserId}`);
      const sellerWallet = deriveDemoWallet(`seller:${trade.sellerUserId}`);

      const { syncResult } = await persistRecord({
        entityType: BlockchainEntityType.TRADE,
        entityId: trade.id,
        recordType: BlockchainRecordType.TRANSFER_PROOF,
        ownerUserId: trade.buyerUserId,
        propertyId: trade.propertyId,
        tradeId: trade.id,
        sellOrderId: trade.sellOrderId,
        txHash: input.txHash ?? null,
        walletAddress: buyerWallet,
        contractAddress: input.contractAddress ?? null,
        blockNumber: input.blockNumber ?? null,
        proofPayload: {
          ...(input.proofPayload ?? {}),
          propertyId: trade.propertyId,
          sharesTransferred: trade.sharesTraded,
          fromAddress: sellerWallet,
          toAddress: buyerWallet,
          buyerUserId: trade.buyerUserId,
          sellerUserId: trade.sellerUserId,
        },
      });

      await prisma.trade.update({
        where: { id: trade.id },
        data: {
          verificationStatus:
            syncResult.status === BlockchainSyncStatus.CONFIRMED
              ? VerificationStatus.VERIFIED
              : trade.verificationStatus,
          blockchainTxHash: syncResult.txHash ?? trade.blockchainTxHash ?? null,
        },
      });

      return this.getTransactionVerification(
        { userId: trade.buyerUserId, role: UserRole.ADMIN },
        trade.id
      );
    });
  },

  async syncPendingRecords(limit = 25) {
    const pending = await blockchainRepository.findPendingRecords(limit);
    const results = await Promise.all(
      pending.map(async (record) => {
        const syncResult = await provider.syncRecord({
          entityType: record.entityType,
          entityId: record.entityId,
          recordType: record.recordType,
          txHash: record.txHash,
          walletAddress: record.walletAddress,
          contractAddress: record.contractAddress,
          blockNumber: record.blockNumber,
          proofPayload:
            record.proofPayload && typeof record.proofPayload === "object"
              ? (record.proofPayload as Record<string, unknown>)
              : null,
        });

        return blockchainRepository.updateStatus(record.id, {
          status: syncResult.status,
          txHash: syncResult.txHash,
          blockNumber: syncResult.blockNumber,
          contractAddress: syncResult.contractAddress,
          chainId: syncResult.chainId,
          walletAddress: syncResult.walletAddress,
          proofPayload:
            (syncResult.proofPayload as Prisma.InputJsonValue | undefined) ?? undefined,
          syncedAt: new Date(),
          verifiedAt:
            syncResult.status === BlockchainSyncStatus.CONFIRMED ? new Date() : null,
          lastError:
            syncResult.status === BlockchainSyncStatus.FAILED
              ? syncResult.note
              : null,
        });
      })
    );

    return {
      processed: results.length,
      provider: provider.getRuntimeConfig().provider,
      blockchainEnabled: provider.getRuntimeConfig().enabled,
    };
  },
};
