export const testConfig = {
  apiBaseUrl: process.env.TEST_API_BASE_URL || "http://127.0.0.1:4100",
  databaseUrl:
    process.env.TEST_DATABASE_URL || "postgres://app:app@localhost:5433/fractional",
};

