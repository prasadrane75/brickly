import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnServer, stopServer } from "./lib/process-utils.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");

const apiPort = process.env.TEST_API_PORT || process.env.PORT || "4100";
const databaseUrl =
  process.env.TEST_DATABASE_URL || process.env.DATABASE_URL || "postgres://app:app@localhost:5433/fractional";

const env = {
  ...process.env,
  PORT: apiPort,
  DATABASE_URL: databaseUrl,
  JWT_SECRET: process.env.JWT_SECRET || "test-secret",
  CORS_ORIGINS: process.env.CORS_ORIGINS || "http://localhost:3000,http://localhost:3100",
  WEB_BASE_URL: process.env.WEB_BASE_URL || "http://localhost:3100",
  DISABLE_EMAIL_VERIFICATION: process.env.DISABLE_EMAIL_VERIFICATION || "true",
  ALLOW_EMAIL_BYPASS: process.env.ALLOW_EMAIL_BYPASS || "true",
  AI_ENABLED: process.env.AI_ENABLED || "true",
  AI_PROVIDER: process.env.AI_PROVIDER || "openai",
  AI_REASONING_EFFORT: process.env.AI_REASONING_EFFORT || "low",
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || "test-key",
  OPENAI_BASE_URL: process.env.OPENAI_BASE_URL || "http://127.0.0.1:1",
  OPENAI_MODEL: process.env.OPENAI_MODEL || "gpt-5-mini",
  BLOCKCHAIN_ENABLED: process.env.BLOCKCHAIN_ENABLED || "true",
  BLOCKCHAIN_PROVIDER: process.env.BLOCKCHAIN_PROVIDER || "hardhat-local",
  BLOCKCHAIN_NETWORK: process.env.BLOCKCHAIN_NETWORK || "localhost",
  BLOCKCHAIN_CHAIN_ID: process.env.BLOCKCHAIN_CHAIN_ID || "31337",
  BLOCKCHAIN_RPC_URL: process.env.BLOCKCHAIN_RPC_URL || "http://127.0.0.1:8545",
  BLOCKCHAIN_SYNC_CONFIRMATIONS: process.env.BLOCKCHAIN_SYNC_CONFIRMATIONS || "1",
};

const child = spawnServer(`${process.execPath} --import tsx apps/api/src/index.ts`, {
  cwd: repoRoot,
  env,
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, async () => {
    await stopServer(child);
    process.exit(0);
  });
}

child.on("exit", (code) => {
  process.exit(code ?? 0);
});

