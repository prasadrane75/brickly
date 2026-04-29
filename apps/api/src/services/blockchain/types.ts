import type {
  BlockchainEntityType,
  BlockchainRecordType,
  BlockchainSyncStatus,
  UserRole,
} from "../../db/prisma-client.js";

export type BlockchainServiceStatus = "disabled" | "demo-registry" | "hardhat-local";

export type BlockchainRuntimeConfig = {
  enabled: boolean;
  provider: string;
  network: string;
  chainId: number | null;
  contractAddress: string | null;
  syncConfirmations: number;
};

export type BlockchainSyncInput = {
  entityType: BlockchainEntityType;
  entityId: string;
  recordType: BlockchainRecordType;
  txHash?: string | null;
  walletAddress?: string | null;
  contractAddress?: string | null;
  blockNumber?: number | null;
  proofPayload?: Record<string, unknown> | null;
};

export type IssueSharesInput = {
  propertyId: string;
  holderAddress: string;
  sharesOwned: number;
  metadata: Record<string, unknown>;
};

export type TransferSharesInput = {
  propertyId: string;
  fromAddress: string;
  toAddress: string;
  sharesTransferred: number;
  metadata: Record<string, unknown>;
};

export type BlockchainSyncResult = {
  status: BlockchainSyncStatus;
  txHash: string | null;
  blockNumber: number | null;
  contractAddress: string | null;
  chainId: number | null;
  walletAddress: string | null;
  proofPayload: Record<string, unknown> | null;
  note: string;
};

export type BlockchainProvider = {
  status: BlockchainServiceStatus;
  getRuntimeConfig(): BlockchainRuntimeConfig;
  issueShares(input: IssueSharesInput): Promise<BlockchainSyncResult>;
  transferShares(input: TransferSharesInput): Promise<BlockchainSyncResult>;
  syncRecord(input: BlockchainSyncInput): Promise<BlockchainSyncResult>;
};

export type VerificationRecordView = {
  id: string;
  recordType: BlockchainRecordType;
  status: BlockchainSyncStatus;
  txHash: string | null;
  blockNumber: number | null;
  walletAddress: string | null;
  contractAddress: string | null;
  verifiedAt: string | null;
  createdAt: string;
};

export type VerificationSnapshot = {
  entityType: BlockchainEntityType;
  entityId: string;
  verificationStatus: string;
  blockchainRef: string | null;
  blockchainEnabled: boolean;
  provider: string;
  providerStatus: BlockchainServiceStatus;
  network: string;
  chainId: number | null;
  contractAddress: string | null;
  records: VerificationRecordView[];
  latestRecord: VerificationRecordView | null;
  note: string;
};

export type RecordOwnershipProofInput = {
  propertyId: string;
  ownerUserId?: string | null;
  txHash?: string | null;
  walletAddress?: string | null;
  contractAddress?: string | null;
  blockNumber?: number | null;
  proofPayload?: Record<string, unknown> | null;
};

export type RecordTransferProofInput = {
  transactionId: string;
  txHash?: string | null;
  walletAddress?: string | null;
  contractAddress?: string | null;
  blockNumber?: number | null;
  proofPayload?: Record<string, unknown> | null;
};

export type TransactionAccessContext = {
  userId: string;
  role: UserRole;
};
