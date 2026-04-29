import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnServer, stopServer } from "./lib/process-utils.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");

const webPort = process.env.TEST_WEB_PORT || "3100";
const apiPort = process.env.TEST_API_PORT || "4100";

const env = {
  ...process.env,
  PORT: webPort,
  NEXT_PUBLIC_API_BASE_URL:
    process.env.NEXT_PUBLIC_API_BASE_URL || `http://127.0.0.1:${apiPort}`,
};

const child = spawnServer("npm --workspace apps/web run dev", {
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

