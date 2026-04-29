import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { runCommand } from "./lib/process-utils.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");

const databaseUrl =
  process.env.TEST_DATABASE_URL || "postgres://app:app@localhost:5433/fractional";
const reuseExistingApp = process.env.BRICKLY_TEST_REUSE_APP === "true";

const commandEnv = {
  ...process.env,
  DATABASE_URL: databaseUrl,
};

function runCommandCapturing(command, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, {
      cwd: options.cwd,
      env: options.env,
      stdio: ["inherit", "pipe", "pipe"],
      shell: true,
    });

    let output = "";

    child.stdout.on("data", (chunk) => {
      const text = chunk.toString();
      output += text;
      process.stdout.write(text);
    });

    child.stderr.on("data", (chunk) => {
      const text = chunk.toString();
      output += text;
      process.stderr.write(text);
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve({ code: 0, output });
        return;
      }

      reject(new Error(`Command failed (${code ?? "unknown"}): ${command}`));
    });
  });
}

async function tableExists(tableName) {
  const result = await runCommandCapturing(
    `docker compose exec -T db psql -U app -d fractional -tAc "SELECT to_regclass('public.\"${tableName}\"');"`,
    {
      cwd: repoRoot,
      env: commandEnv,
    }
  );
  return result.output.trim() === tableName;
}

async function rowCount(tableName) {
  const result = await runCommandCapturing(
    `docker compose exec -T db psql -U app -d fractional -tAc 'SELECT COUNT(*) FROM "${tableName}";'`,
    {
      cwd: repoRoot,
      env: commandEnv,
    }
  );
  return Number(result.output.trim() || 0);
}

function runCommandAllowingP3005(command, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, {
      cwd: options.cwd,
      env: options.env,
      stdio: ["inherit", "pipe", "pipe"],
      shell: true,
    });

    let output = "";

    child.stdout.on("data", (chunk) => {
      const text = chunk.toString();
      output += text;
      process.stdout.write(text);
    });

    child.stderr.on("data", (chunk) => {
      const text = chunk.toString();
      output += text;
      process.stderr.write(text);
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve({ skipped: false });
        return;
      }

      if (/P3005/.test(output)) {
        console.warn(
          "[tests] Prisma migrate deploy returned P3005; assuming the test database is already initialized."
        );
        resolve({ skipped: true });
        return;
      }

      reject(new Error(`Command failed (${code ?? "unknown"}): ${command}`));
    });
  });
}

async function main() {
  if (reuseExistingApp) {
    console.log("[tests] BRICKLY_TEST_REUSE_APP=true; reusing existing app/start environment.");
    return;
  }

  await runCommand("docker compose up -d db", {
    cwd: repoRoot,
    env: commandEnv,
  });

  await runCommand("npm --workspace apps/api run prisma:generate", {
    cwd: repoRoot,
    env: commandEnv,
  });

  const migrateResult = await runCommandAllowingP3005(
    "npm --workspace apps/api exec prisma migrate deploy --schema prisma/schema.prisma",
    {
      cwd: repoRoot,
      env: commandEnv,
    }
  );

  const hasUsersTable = await tableExists("User");
  const shouldSeed = !migrateResult.skipped || !hasUsersTable || (hasUsersTable && (await rowCount("User")) === 0);

  if (shouldSeed) {
    await runCommand("npm --workspace apps/api run prisma:seed", {
      cwd: repoRoot,
      env: commandEnv,
    });
  } else {
    console.log("[tests] Existing seeded database detected; skipping seed.");
  }

  await runCommand("npm run chain:compile", {
    cwd: repoRoot,
    env: commandEnv,
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
