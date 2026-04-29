import { apiFetch } from "../../lib/api";
import type { ApiResponse } from "../../shared/api-types";

export type BlockchainVerificationSnapshot = {
  entityType: "PROPERTY" | "TRADE" | "BUY_ORDER" | "SELL_ORDER" | "DOCUMENT";
  entityId: string;
  verificationStatus: string;
  blockchainRef: string | null;
  blockchainEnabled: boolean;
  provider: string;
  providerStatus: "disabled" | "demo-registry";
  network: string;
  chainId: number | null;
  contractAddress: string | null;
  note: string;
  latestRecord: {
    id: string;
    recordType: string;
    status: string;
    txHash: string | null;
    blockNumber: number | null;
    walletAddress: string | null;
    contractAddress: string | null;
    verifiedAt: string | null;
    createdAt: string;
  } | null;
  records: Array<{
    id: string;
    recordType: string;
    status: string;
    txHash: string | null;
    blockNumber: number | null;
    walletAddress: string | null;
    contractAddress: string | null;
    verifiedAt: string | null;
    createdAt: string;
  }>;
};

export const blockchainClient = {
  status: "configured" as const,

  async getPropertyVerification(propertyId: string) {
    const response = await apiFetch<ApiResponse<BlockchainVerificationSnapshot>>(
      `/v1/blockchain/properties/${propertyId}/verification`
    );
    return response.data;
  },

  async getTransactionVerification(transactionId: string) {
    const response = await apiFetch<ApiResponse<BlockchainVerificationSnapshot>>(
      `/v1/blockchain/transactions/${transactionId}/verification`
    );
    return response.data;
  },
};
