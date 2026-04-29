type StatusBadgeProps = {
  value: string | null | undefined;
  tone?: "default" | "success" | "warning" | "danger";
};

function inferTone(value: string | null | undefined): StatusBadgeProps["tone"] {
  const normalized = String(value || "").toUpperCase();
  if (["FILLED", "COMPLETED", "APPROVED", "VERIFIED", "ACTIVE", "FUNDED"].includes(normalized)) {
    return "success";
  }
  if (["PENDING", "OPEN", "PARTIAL", "DRAFT", "UNVERIFIED"].includes(normalized)) {
    return "warning";
  }
  if (["CANCELLED", "REJECTED", "ARCHIVED", "SOLD"].includes(normalized)) {
    return "danger";
  }
  return "default";
}

export function StatusBadge({ value, tone }: StatusBadgeProps) {
  const label = value ? value.replaceAll("_", " ") : "Unknown";
  const resolvedTone = tone ?? inferTone(value);
  return <span className={`badge badge-${resolvedTone}`}>{label}</span>;
}
