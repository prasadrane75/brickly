import { Prisma } from "@prisma/client";
import { env } from "../../../config/env.js";
import { clampSummary } from "../formatters/summary.js";
import type { AiGenerateTextInput, AiGenerateTextResult, AiProvider } from "../types/index.js";

type OpenAiResponse = {
  output?: Array<{
    type?: string;
    content?: Array<{
      type?: string;
      text?: string;
      value?: string;
    }>;
    text?: string;
  }>;
  output_text?: string;
};

function extractOutputText(payload: OpenAiResponse) {
  if (typeof payload.output_text === "string" && payload.output_text.trim()) {
    return payload.output_text.trim();
  }

  for (const item of payload.output ?? []) {
    if (typeof item.text === "string" && item.text.trim()) {
      return item.text.trim();
    }

    for (const content of item.content ?? []) {
      const candidate =
        typeof content.text === "string"
          ? content.text
          : typeof content.value === "string"
            ? content.value
            : "";

      if (
        (content.type === "output_text" || content.type === "text" || !content.type) &&
        candidate.trim()
      ) {
        return candidate.trim();
      }
    }
  }

  throw new Error(
    `OpenAI response did not include output text: ${JSON.stringify(payload).slice(0, 800)}`
  );
}

export const openAiProvider: AiProvider = {
  name: "openai",

  isConfigured() {
    return Boolean(env.openAiApiKey);
  },

  async generateText(input: AiGenerateTextInput): Promise<AiGenerateTextResult> {
    const response = await fetch(`${env.openAiBaseUrl}/responses`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.openAiApiKey}`,
      },
      body: JSON.stringify({
        model: env.openAiModel,
        instructions: input.instructions,
        reasoning: {
          effort: env.aiReasoningEffort,
        },
        input: [
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: input.content,
              },
            ],
          },
        ],
        max_output_tokens: 700,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI request failed: ${response.status} ${errorText}`);
    }

    const payload = (await response.json()) as OpenAiResponse;
    return {
      summary: clampSummary(extractOutputText(payload)),
      rawResponse: payload as Prisma.JsonValue,
    };
  },
};
