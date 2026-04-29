import { env } from "../../../config/env.js";

export function logAiDebug(message: string, error?: unknown) {
  if (env.nodeEnv === "production") {
    return;
  }

  if (error) {
    console.error(`[ai] ${message}`, error);
    return;
  }

  console.warn(`[ai] ${message}`);
}
