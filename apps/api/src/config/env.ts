const defaultDatabaseUrl = "postgres://app:app@localhost:5433/fractional";

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = defaultDatabaseUrl;
}

const port = Number(process.env.PORT) || 4000;

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port,
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET || "dev-secret",
  apiBaseUrl: process.env.API_BASE_URL || `http://localhost:${port}`,
  corsOrigins: (process.env.CORS_ORIGINS ||
    "https://app.bricklyusa.com,http://localhost:3000")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
  webBaseUrl: process.env.WEB_BASE_URL || "http://localhost:3000",
  disableEmailVerification: process.env.DISABLE_EMAIL_VERIFICATION === "true",
  allowEmailBypass: process.env.ALLOW_EMAIL_BYPASS === "true",
  aiEnabled: process.env.AI_ENABLED !== "false",
  aiProvider: process.env.AI_PROVIDER || "openai",
  aiReasoningEffort: process.env.AI_REASONING_EFFORT || "low",
  openAiApiKey: process.env.OPENAI_API_KEY || "",
  openAiModel: process.env.OPENAI_MODEL || "gpt-5-mini",
  openAiBaseUrl: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
};

// Extension point: centralize future per-environment feature flags here
// instead of spreading AI/blockchain toggles across route handlers.
