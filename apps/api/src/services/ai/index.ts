export type AiServiceStatus = "placeholder";

export type AiService = {
  status: AiServiceStatus;
  summarizeDocument(input: { documentId: string }): Promise<never>;
};

// PHASE_2_AI: replace this placeholder with provider-backed orchestration,
// prompt management, safety policy checks, and model-specific adapters.
export const aiService: AiService = {
  status: "placeholder",
  async summarizeDocument() {
    throw new Error("PHASE_2_AI: AI service is not enabled in Phase 1");
  },
};
