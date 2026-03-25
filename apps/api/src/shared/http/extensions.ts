export function buildExtensionFields(input?: {
  verificationStatus?: string | null;
  blockchainTxHash?: string | null;
  aiSummaryCache?: string | null;
}) {
  return {
    verificationStatus: input?.verificationStatus ?? "UNVERIFIED",
    blockchainRef: input?.blockchainTxHash ?? null,
    aiSummaryCache: input?.aiSummaryCache ?? null,
    aiInsightAvailable: Boolean(input?.aiSummaryCache),
  };
}
