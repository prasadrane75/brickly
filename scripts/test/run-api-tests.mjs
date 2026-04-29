import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  isHttpReady,
  isPortOpen,
  runCommand,
  spawnServer,
  stopServer,
  waitForHttp,
  waitForPort,
} from "./lib/process-utils.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");

const reuseExistingApp = process.env.BRICKLY_TEST_REUSE_APP === "true";
const apiPort = process.env.TEST_API_PORT || (reuseExistingApp ? "4000" : "4100");
const apiBaseUrl = process.env.TEST_API_BASE_URL || `http://127.0.0.1:${apiPort}`;
const testTarget = process.argv[2] || "tests/api/*.test.ts";

const env = {
  ...process.env,
  BRICKLY_TEST_REUSE_APP: process.env.BRICKLY_TEST_REUSE_APP || "false",
  TEST_API_PORT: apiPort,
  TEST_API_BASE_URL: apiBaseUrl,
  TEST_DATABASE_URL:
    process.env.TEST_DATABASE_URL || "postgres://app:app@localhost:5433/fractional",
};

let hardhatServer;
let apiServer;

async function main() {
  if (!reuseExistingApp) {
    await runCommand(`${process.execPath} scripts/test/prepare-environment.mjs`, {
      cwd: repoRoot,
      env,
    });
  }

  const hardhatRunning = await isPortOpen(8545);
  if (!hardhatRunning) {
    hardhatServer = spawnServer(`${process.execPath} scripts/test/start-hardhat-node.mjs`, {
      cwd: repoRoot,
      env,
    });
    await waitForPort(8545, { timeoutMs: 60_000 });
  }

  const apiHealthy = await isHttpReady(`${apiBaseUrl}/health`);
  if (!apiHealthy) {
    apiServer = spawnServer(`${process.execPath} --import tsx scripts/test/start-api.mjs`, {
      cwd: repoRoot,
      env,
    });
    await waitForHttp(`${apiBaseUrl}/health`, { timeoutMs: 60_000 });
  }

  await runCommand(`${process.execPath} --import tsx --test ${testTarget}`, {
    cwd: repoRoot,
    env,
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await stopServer(apiServer);
    await stopServer(hardhatServer);
  });
