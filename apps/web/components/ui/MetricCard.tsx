import { ReactNode } from "react";

type MetricCardProps = {
  label: string;
  value: string;
  detail?: string;
  accent?: "gold" | "blue" | "green";
  footer?: ReactNode;
};

export function MetricCard({
  label,
  value,
  detail,
  accent = "blue",
  footer,
}: MetricCardProps) {
  return (
    <article className={`metric-card metric-card-${accent}`}>
      <span className="metric-label">{label}</span>
      <strong>{value}</strong>
      {detail ? <p>{detail}</p> : null}
      {footer ? <div className="metric-footer">{footer}</div> : null}
    </article>
  );
}
