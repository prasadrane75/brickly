export const aiClient = {
  status: "placeholder" as const,
  async summarizePortfolio() {
    throw new Error("PHASE_2_AI: AI client is not enabled in Phase 1");
  },
};
