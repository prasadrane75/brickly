import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../../..");

export default async function globalSetup() {
  if (process.env.BRICKLY_TEST_REUSE_APP === "true") {
    return;
  }

  execFileSync(process.execPath, ["scripts/test/prepare-environment.mjs"], {
    cwd: repoRoot,
    stdio: "inherit",
    env: process.env,
  });
}
