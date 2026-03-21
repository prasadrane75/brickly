export type BlockchainServiceStatus = "placeholder";

export type BlockchainService = {
  status: BlockchainServiceStatus;
  verifyOwnership(input: { propertyId: string; userId: string }): Promise<never>;
};

// PHASE_3_BLOCKCHAIN: replace this placeholder with wallet, signer, and
// chain-index integration once on-chain ownership flows are introduced.
export const blockchainService: BlockchainService = {
  status: "placeholder",
  async verifyOwnership() {
    throw new Error(
      "PHASE_3_BLOCKCHAIN: blockchain service is not enabled in Phase 1"
    );
  },
};
