import { Prisma } from "@prisma/client";

export type AiServiceStatus = "ready" | "fallback";

export type AiProviderName = "openai" | "ollama" | "deterministic";

export type AiSummaryResponse = {
  summary: string;
  provider: AiProviderName;
  model: string;
  cachedAt: string;
  source: "generated" | "fallback";
};

export type GeneratedSummaryResult = AiSummaryResponse & {
  rawResponse?: Prisma.JsonValue;
  errorMessage?: string | null;
};

export type AiGenerateTextInput = {
  instructions: string;
  content: string;
};

export type AiGenerateTextResult = {
  summary: string;
  rawResponse?: Prisma.JsonValue;
};

export type AiProvider = {
  name: Exclude<AiProviderName, "deterministic">;
  isConfigured(): boolean;
  generateText(input: AiGenerateTextInput): Promise<AiGenerateTextResult>;
};
