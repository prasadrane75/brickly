import { env } from "../../../config/env.js";
import { ollamaProvider } from "./ollama.provider.js";
import { openAiProvider } from "./openai.provider.js";
import type { AiProvider, AiProviderName } from "../types/index.js";

export function getAiProvider(): AiProvider {
  if (env.aiProvider === "ollama") {
    return ollamaProvider;
  }

  return openAiProvider;
}

export function getAiRuntimeConfig(): {
  provider: AiProvider;
  providerName: AiProviderName;
  model: string;
  isReady: boolean;
} {
  const provider = getAiProvider();
  const isReady = env.aiEnabled && provider.isConfigured();

  return {
    provider,
    providerName: isReady ? provider.name : "deterministic",
    model: isReady ? (env.aiProvider === "ollama" ? "ollama" : env.openAiModel) : "deterministic-fallback",
    isReady,
  };
}
