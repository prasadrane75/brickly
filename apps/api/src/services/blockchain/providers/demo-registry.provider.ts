import { BlockchainSyncStatus } from "../../../db/prisma-client.js";
import { env } from "../../../config/env.js";
import type {
  BlockchainProvider,
  BlockchainSyncInput,
  BlockchainSyncResult,
  IssueSharesInput,
  TransferSharesInput,
} from "../types.js";

function normalizeProofPayload(
  input: BlockchainSyncInput
): Record<string, unknown> | null {
  return input.proofPayload
    ? {
        ...input.proofPayload,
        entityType: input.entityType,
        entityId: input.entityId,
        recordType: input.recordType,
      }
    : null;
}

export const demoRegistryProvider: BlockchainProvider = {
  status: env.blockchainEnabled ? "demo-registry" : "disabled",

  getRuntimeConfig() {
    return {
      enabled: env.blockchainEnabled,
      provider: env.blockchainProvider,
      network: env.blockchainNetwork,
      chainId: env.blockchainChainId,
      contractAddress: env.blockchainContractAddress || null,
      syncConfirmations: env.blockchainSyncConfirmations,
    };
  },

  async issueShares(input: IssueSharesInput): Promise<BlockchainSyncResult> {
    const runtime = this.getRuntimeConfig();

    if (!runtime.enabled) {
      return {
        status: BlockchainSyncStatus.SKIPPED,
        txHash: null,
        blockNumber: null,
        contractAddress: runtime.contractAddress,
        chainId: runtime.chainId,
        walletAddress: input.holderAddress,
        proofPayload: {
          ...input.metadata,
          holderAddress: input.holderAddress,
          sharesOwned: input.sharesOwned,
          propertyId: input.propertyId,
        },
        note: "Blockchain is optional and currently disabled for this environment.",
      };
    }

    return {
      status: BlockchainSyncStatus.CONFIRMED,
      txHash: `demo-issue-${input.propertyId}`,
      blockNumber: null,
      contractAddress: runtime.contractAddress,
      chainId: runtime.chainId,
      walletAddress: input.holderAddress,
      proofPayload: {
        ...input.metadata,
        holderAddress: input.holderAddress,
        sharesOwned: input.sharesOwned,
        propertyId: input.propertyId,
      },
      note: "Recorded against the configured demo registry provider.",
    };
  },

  async transferShares(input: TransferSharesInput): Promise<BlockchainSyncResult> {
    const runtime = this.getRuntimeConfig();

    if (!runtime.enabled) {
      return {
        status: BlockchainSyncStatus.SKIPPED,
        txHash: null,
        blockNumber: null,
        contractAddress: runtime.contractAddress,
        chainId: runtime.chainId,
        walletAddress: input.toAddress,
        proofPayload: {
          ...input.metadata,
          fromAddress: input.fromAddress,
          toAddress: input.toAddress,
          sharesTransferred: input.sharesTransferred,
          propertyId: input.propertyId,
        },
        note: "Blockchain is optional and currently disabled for this environment.",
      };
    }

    return {
      status: BlockchainSyncStatus.CONFIRMED,
      txHash: `demo-transfer-${input.propertyId}`,
      blockNumber: null,
      contractAddress: runtime.contractAddress,
      chainId: runtime.chainId,
      walletAddress: input.toAddress,
      proofPayload: {
        ...input.metadata,
        fromAddress: input.fromAddress,
        toAddress: input.toAddress,
        sharesTransferred: input.sharesTransferred,
        propertyId: input.propertyId,
      },
      note: "Recorded against the configured demo registry provider.",
    };
  },

  async syncRecord(input): Promise<BlockchainSyncResult> {
    const runtime = this.getRuntimeConfig();

    if (!runtime.enabled) {
      return {
        status: BlockchainSyncStatus.SKIPPED,
        txHash: input.txHash ?? null,
        blockNumber: input.blockNumber ?? null,
        contractAddress: input.contractAddress ?? runtime.contractAddress,
        chainId: runtime.chainId,
        walletAddress: input.walletAddress ?? null,
        proofPayload: normalizeProofPayload(input),
        note: "Blockchain is optional and currently disabled for this environment.",
      };
    }

    return {
      status: BlockchainSyncStatus.CONFIRMED,
      txHash: input.txHash ?? null,
      blockNumber: input.blockNumber ?? null,
      contractAddress: input.contractAddress ?? runtime.contractAddress,
      chainId: runtime.chainId,
      walletAddress: input.walletAddress ?? null,
      proofPayload: normalizeProofPayload(input),
      note: "Recorded against the configured demo registry provider.",
    };
  },
};
