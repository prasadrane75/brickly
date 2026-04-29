import { clampSummary } from "../formatters/summary.js";

export type AuditSummaryPayload = {
  logs: Array<{
    action: string;
    entityType: string;
    summary: string;
    createdAt: string;
    tradeProofStatus: string | null;
    propertyProofStatus: string | null;
  }>;
  verificationCoverage: number;
  anomalyHints: string[];
};

export function buildAuditSummaryPrompt(payload: AuditSummaryPayload) {
  return JSON.stringify(payload, null, 2);
}

export function buildAuditSummaryFallback(payload: AuditSummaryPayload) {
  const keyEvents = payload.logs.slice(0, 5).map((log) => `${log.createdAt}: ${log.summary}`);
  return {
    summary: clampSummary(
      `The audit stream includes ${payload.logs.length} recent events with ${payload.verificationCoverage}% verification coverage across related blockchain-backed records.`
    ),
    keyEvents,
    anomalies: payload.anomalyHints,
    verificationCoverage: payload.verificationCoverage,
  };
}

export function getAuditSummaryInstructions() {
  return [
    "Create a concise executive summary of the supplied audit and verification activity.",
    "Surface missing verification or suspicious gaps only when they are present in the input.",
    "Return valid JSON with keys: summary, keyEvents, anomalies, verificationCoverage.",
    "keyEvents and anomalies must be arrays of short strings.",
  ].join(" ");
}
