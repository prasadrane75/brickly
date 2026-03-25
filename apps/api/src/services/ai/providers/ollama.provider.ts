import type { AiGenerateTextInput, AiGenerateTextResult, AiProvider } from "../types/index.js";

// PHASE_2_AI: keep this placeholder so provider selection and service wiring
// are ready for a local model path later without rewriting route handlers.
export const ollamaProvider: AiProvider = {
  name: "ollama",

  isConfigured() {
    return false;
  },

  async generateText(_input: AiGenerateTextInput): Promise<AiGenerateTextResult> {
    throw new Error("OLLAMA_PROVIDER_NOT_IMPLEMENTED");
  },
};
