import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "@playwright/test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");
const reuseExistingApp = process.env.BRICKLY_TEST_REUSE_APP === "true";
const apiPort = process.env.TEST_API_PORT || (reuseExistingApp ? "4000" : "4100");
const webPort = process.env.TEST_WEB_PORT || (reuseExistingApp ? "3000" : "3100");
const hardhatHealthPort = process.env.TEST_HARDHAT_HEALTH_PORT || "9545";

export default defineConfig({
  testDir: "./tests",
  timeout: 30_000,
  fullyParallel: false,
  globalSetup: path.join(__dirname, "tests/global.setup.mjs"),
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || `http://localhost:${webPort}`,
    browserName: "chromium",
    trace: "on-first-retry",
  },
  webServer: [
    {
      command: `${process.execPath} scripts/test/start-hardhat-node.mjs`,
      url: `http://127.0.0.1:${hardhatHealthPort}`,
      cwd: repoRoot,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        ...process.env,
        BRICKLY_TEST_REUSE_APP: process.env.BRICKLY_TEST_REUSE_APP || "false",
        TEST_HARDHAT_HEALTH_PORT: hardhatHealthPort,
      },
    },
    {
      command: `${process.execPath} --import tsx scripts/test/start-api.mjs`,
      url: `http://127.0.0.1:${apiPort}/health`,
      cwd: repoRoot,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        ...process.env,
        BRICKLY_TEST_REUSE_APP: process.env.BRICKLY_TEST_REUSE_APP || "false",
        TEST_API_PORT: apiPort,
      },
    },
    {
      command: `${process.execPath} scripts/test/start-web.mjs`,
      url: `http://127.0.0.1:${webPort}`,
      cwd: repoRoot,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        ...process.env,
        BRICKLY_TEST_REUSE_APP: process.env.BRICKLY_TEST_REUSE_APP || "false",
        TEST_API_PORT: apiPort,
        TEST_WEB_PORT: webPort,
      },
    },
  ],
});
