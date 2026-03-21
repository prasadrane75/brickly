const defaultDatabaseUrl = "postgres://app:app@localhost:5433/fractional";

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = defaultDatabaseUrl;
}

const port = Number(process.env.PORT) || 4000;

export const env = {
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
};

// Extension point: centralize future per-environment feature flags here
// instead of spreading AI/blockchain toggles across route handlers.
