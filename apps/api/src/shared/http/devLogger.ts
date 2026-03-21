import type express from "express";
import { env } from "../../config/env.js";

function isDevelopment() {
  return process.env.NODE_ENV !== "production";
}

export function attachDevRequestLogger(app: express.Express) {
  if (!isDevelopment()) {
    return;
  }

  app.use((req, res, next) => {
    const startedAt = Date.now();
    res.on("finish", () => {
      const durationMs = Date.now() - startedAt;
      console.info(
        `[dev-api] ${req.method} ${req.originalUrl} -> ${res.statusCode} ${durationMs}ms`
      );
    });
    next();
  });
}

export function logDevError(context: string, error: unknown) {
  if (!isDevelopment()) {
    return;
  }

  console.error(`[dev-api:error] ${context}`, error);
}

// TODO PHASE_2_AI: if request/response tracing expands for AI-assisted support,
// keep structured debug hooks here rather than scattering console calls.
// TODO PHASE_3_BLOCKCHAIN: blockchain settlement confirmations can be mirrored
// into the same dev logging pipeline for local diagnosis without changing routes.
