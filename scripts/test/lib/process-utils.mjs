import { spawn } from "node:child_process";
import net from "node:net";

function withShell(command, options = {}) {
  return spawn(command, {
    cwd: options.cwd,
    env: options.env,
    stdio: options.stdio ?? "inherit",
    shell: true,
  });
}

export function runCommand(command, options = {}) {
  return new Promise((resolve, reject) => {
    const child = withShell(command, options);

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`Command failed (${code ?? "unknown"}): ${command}`));
    });
  });
}

export function spawnServer(command, options = {}) {
  const child = withShell(command, options);
  child.on("error", (error) => {
    console.error(`Failed to start server: ${command}`);
    console.error(error);
  });
  return child;
}

export async function isHttpReady(url) {
  try {
    const response = await fetch(url);
    return response.ok;
  } catch {
    return false;
  }
}

export async function waitForHttp(url, options = {}) {
  const timeoutMs = options.timeoutMs ?? 60_000;
  const intervalMs = options.intervalMs ?? 1_000;
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (await isHttpReady(url)) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error(`Timed out waiting for ${url}`);
}

export async function isPortOpen(port, options = {}) {
  const host = options.host ?? "127.0.0.1";
  return new Promise((resolve) => {
    const socket = net.createConnection({ port, host });
    socket.on("connect", () => {
      socket.end();
      resolve(true);
    });
    socket.on("error", () => {
      resolve(false);
    });
  });
}

export async function waitForPort(port, options = {}) {
  const timeoutMs = options.timeoutMs ?? 60_000;
  const intervalMs = options.intervalMs ?? 500;
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const open = await isPortOpen(port, options);
    if (open) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error(`Timed out waiting for ${options.host ?? "127.0.0.1"}:${port}`);
}

export async function stopServer(child) {
  if (!child || child.exitCode !== null || child.killed) {
    return;
  }

  await new Promise((resolve) => {
    const finalize = () => resolve();

    child.once("exit", finalize);
    child.kill("SIGTERM");

    setTimeout(() => {
      if (child.exitCode === null && !child.killed) {
        child.kill("SIGKILL");
      }
    }, 5_000);
  });
}
