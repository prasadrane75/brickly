import path from "node:path";
import http from "node:http";
import { fileURLToPath } from "node:url";
import { isPortOpen, spawnServer, stopServer } from "./lib/process-utils.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");
const healthPort = Number(process.env.TEST_HARDHAT_HEALTH_PORT || "9545");
const reuseExistingApp = process.env.BRICKLY_TEST_REUSE_APP === "true";

let child = null;

if (!(reuseExistingApp && (await isPortOpen(8545)))) {
  child = spawnServer("npx hardhat node --hostname 127.0.0.1 --port 8545", {
    cwd: repoRoot,
    env: process.env,
  });
}

const server = http.createServer(async (_req, res) => {
  const portOpen = await isPortOpen(8545);
  if (portOpen && (!child || child.exitCode === null)) {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  res.writeHead(503, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ ok: false }));
});

server.listen(healthPort, "127.0.0.1");

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, async () => {
    server.close();
    await stopServer(child);
    process.exit(0);
  });
}

if (child) {
  child.on("exit", (code) => {
    server.close();
    process.exit(code ?? 0);
  });
}
