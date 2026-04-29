import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";

function runNodeEval(source: string, env: NodeJS.ProcessEnv = {}) {
  return new Promise<string>((resolve, reject) => {
    execFile(
      process.execPath,
      ["--import", "tsx", "--eval", source],
      {
        cwd: process.cwd(),
        env: {
          ...process.env,
          ...env,
        },
      },
      (error, stdout, stderr) => {
        if (error) {
          reject(new Error(stderr || stdout || error.message));
          return;
        }

        resolve(stdout.trim());
      }
    );
  });
}

test("AI provider factory returns deterministic runtime when OpenAI is not configured", async () => {
  const stdout = await runNodeEval(
    `
      const { getAiRuntimeConfig } = await import("./apps/api/src/services/ai/providers/provider-factory.ts");
      console.log(JSON.stringify(getAiRuntimeConfig()));
    `,
    {
      AI_ENABLED: "true",
      AI_PROVIDER: "openai",
      OPENAI_API_KEY: "",
      OPENAI_MODEL: "gpt-5-mini",
    }
  );

  const runtime = JSON.parse(stdout) as {
    providerName: string;
    model: string;
    isReady: boolean;
  };

  assert.equal(runtime.isReady, false);
  assert.equal(runtime.providerName, "deterministic");
  assert.equal(runtime.model, "deterministic-fallback");
});

test("AI provider factory returns OpenAI runtime when configured", async () => {
  const stdout = await runNodeEval(
    `
      const { getAiRuntimeConfig } = await import("./apps/api/src/services/ai/providers/provider-factory.ts");
      console.log(JSON.stringify(getAiRuntimeConfig()));
    `,
    {
      AI_ENABLED: "true",
      AI_PROVIDER: "openai",
      OPENAI_API_KEY: "test-key",
      OPENAI_MODEL: "gpt-5-mini",
    }
  );

  const runtime = JSON.parse(stdout) as {
    providerName: string;
    model: string;
    isReady: boolean;
  };

  assert.equal(runtime.isReady, true);
  assert.equal(runtime.providerName, "openai");
  assert.equal(runtime.model, "gpt-5-mini");
});

test("AI provider factory degrades safely when ollama is selected but unavailable", async () => {
  const stdout = await runNodeEval(
    `
      const { getAiRuntimeConfig } = await import("./apps/api/src/services/ai/providers/provider-factory.ts");
      console.log(JSON.stringify(getAiRuntimeConfig()));
    `,
    {
      AI_ENABLED: "true",
      AI_PROVIDER: "ollama",
      OPENAI_API_KEY: "unused",
    }
  );

  const runtime = JSON.parse(stdout) as {
    providerName: string;
    model: string;
    isReady: boolean;
  };

  assert.equal(runtime.isReady, false);
  assert.equal(runtime.providerName, "deterministic");
  assert.equal(runtime.model, "deterministic-fallback");
});

test("OpenAI provider extracts text and clamps oversized responses", async () => {
  const oversizedResponse = `${"Long response ".repeat(120)}done`;
  const stdout = await runNodeEval(
    `
      global.fetch = async () =>
        new Response(
          JSON.stringify({ output_text: ${JSON.stringify(oversizedResponse)} }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      const { openAiProvider } = await import("./apps/api/src/services/ai/providers/openai.provider.ts");
      const result = await openAiProvider.generateText({
        instructions: "Summarize",
        content: "Test content"
      });
      console.log(JSON.stringify({
        configured: openAiProvider.isConfigured(),
        summary: result.summary
      }));
    `,
    {
      OPENAI_API_KEY: "test-key",
      OPENAI_MODEL: "gpt-5-mini",
      OPENAI_BASE_URL: "http://example.test/v1",
      AI_REASONING_EFFORT: "low",
    }
  );

  const result = JSON.parse(stdout) as { configured: boolean; summary: string };
  assert.equal(result.configured, true);
  assert.ok(result.summary.length <= 900);
  assert.ok(result.summary.includes("Long response"));
});

test("OpenAI provider throws when the upstream request fails", async () => {
  await assert.rejects(
    runNodeEval(
      `
        global.fetch = async () => new Response("upstream failed", { status: 500 });
        const { openAiProvider } = await import("./apps/api/src/services/ai/providers/openai.provider.ts");
        await openAiProvider.generateText({
          instructions: "Summarize",
          content: "Test content"
        });
      `,
      {
        OPENAI_API_KEY: "test-key",
        OPENAI_MODEL: "gpt-5-mini",
        OPENAI_BASE_URL: "http://example.test/v1",
      }
    ),
    /OpenAI request failed: 500/
  );
});

test("Ollama provider reports not configured and rejects generateText", async () => {
  const stdout = await runNodeEval(
    `
      const { ollamaProvider } = await import("./apps/api/src/services/ai/providers/ollama.provider.ts");
      let errorMessage = "";
      try {
        await ollamaProvider.generateText({
          instructions: "Summarize",
          content: "Test content"
        });
      } catch (error) {
        errorMessage = error instanceof Error ? error.message : String(error);
      }
      console.log(JSON.stringify({
        configured: ollamaProvider.isConfigured(),
        errorMessage
      }));
    `
  );

  const result = JSON.parse(stdout) as { configured: boolean; errorMessage: string };
  assert.equal(result.configured, false);
  assert.match(result.errorMessage, /OLLAMA_PROVIDER_NOT_IMPLEMENTED/);
});
