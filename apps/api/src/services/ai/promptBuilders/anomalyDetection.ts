export type AnomalyDetectionPayload = {
  anomalies: Array<{
    category: string;
    severity: "LOW" | "MEDIUM" | "HIGH";
    title: string;
    referenceId: string | null;
    detail: string;
  }>;
};

export function buildAnomalyDetectionPrompt(payload: AnomalyDetectionPayload) {
  return JSON.stringify(payload, null, 2);
}

export function buildAnomalyDetectionFallback(payload: AnomalyDetectionPayload) {
  const highestSeverity: "NONE" | "LOW" | "MEDIUM" | "HIGH" = payload.anomalies.some(
    (item) => item.severity === "HIGH"
  )
    ? "HIGH"
    : payload.anomalies.some((item) => item.severity === "MEDIUM")
      ? "MEDIUM"
      : payload.anomalies.some((item) => item.severity === "LOW")
        ? "LOW"
        : "NONE";

  return {
    anomalies: payload.anomalies.map((item) => ({
      title: item.title,
      severity: item.severity,
      explanation: item.detail,
      category: item.category,
      referenceId: item.referenceId,
    })),
    severity: highestSeverity,
    explanation:
      highestSeverity === "NONE"
        ? "No material inconsistencies were flagged by the current rule set."
        : `${payload.anomalies.length} anomaly candidates were flagged by deterministic checks and should be reviewed.`,
  };
}

export function getAnomalyDetectionInstructions() {
  return [
    "Explain the supplied deterministic anomaly findings without inventing new issues.",
    "Do not suppress flagged anomalies.",
    "Return valid JSON with keys: anomalies, severity, explanation.",
    "anomalies must be an array of objects with keys: title, severity, explanation, category, referenceId.",
  ].join(" ");
}
