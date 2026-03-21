export const blockchainClient = {
  status: "placeholder" as const,
  async verifyWalletOwnership() {
    throw new Error(
      "PHASE_3_BLOCKCHAIN: blockchain client is not enabled in Phase 1"
    );
  },
};
