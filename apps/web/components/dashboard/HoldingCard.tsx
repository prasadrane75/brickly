import { FutureBadge } from "../ui/FutureBadge";
import { formatCurrency, formatPercent } from "../../shared/format";

type HoldingCardProps = {
  propertyName: string;
  location: string;
  status: string;
  sharesOwned: number;
  estimatedValue: number;
  estimatedMonthlyIncome: number;
  allocationWeight: number;
  verificationStatus: string;
};

export function HoldingCard({
  propertyName,
  location,
  status,
  sharesOwned,
  estimatedValue,
  estimatedMonthlyIncome,
  allocationWeight,
  verificationStatus,
}: HoldingCardProps) {
  return (
    <article className="dashboard-holding-card">
      <div className="dashboard-holding-head">
        <strong>{propertyName}</strong>
        <span className="badge">{status}</span>
      </div>
      <p className="muted">{location}</p>
      <div className="dashboard-holding-metrics">
        <span>{sharesOwned} shares</span>
        <span>{formatCurrency(estimatedValue)}</span>
      </div>
      <p className="muted">
        Income est. {formatCurrency(estimatedMonthlyIncome)} / month
      </p>
      <div className="dashboard-holding-metrics dashboard-holding-footnote">
        <span className="badge subtle">Allocation {formatPercent(allocationWeight)}</span>
        <span className="badge subtle">{verificationStatus}</span>
      </div>
      <div className="dashboard-inline-badges">
        <FutureBadge label="Verified Ownership" phase="PHASE_3_BLOCKCHAIN" />
      </div>
    </article>
  );
}
