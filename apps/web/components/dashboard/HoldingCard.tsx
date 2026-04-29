import { formatBlockchainHash, formatCurrency, formatPercent } from "../../shared/format";

type HoldingCardProps = {
  propertyName: string;
  location: string;
  status: string;
  sharesOwned: number;
  estimatedValue: number;
  estimatedMonthlyIncome: number;
  allocationWeight: number;
  verificationStatus: string;
  blockchainRef?: string | null;
  blockchainVerified?: boolean;
  proofLabel?: string;
  proofRef?: string | null;
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
  blockchainRef,
  blockchainVerified,
  proofLabel,
  proofRef,
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
        <span className={`badge ${blockchainVerified ? "success" : "subtle"}`}>
          {blockchainVerified ? "Verified" : verificationStatus}
        </span>
      </div>
      <div className="dashboard-inline-badges">
        <span className={`badge ${blockchainVerified ? "success" : "subtle"}`}>
          {blockchainVerified ? "Property verified" : proofLabel || "Property proof pending"}
        </span>
        {proofRef || blockchainRef ? (
          <span className="badge subtle">{formatBlockchainHash(proofRef || blockchainRef)}</span>
        ) : null}
      </div>
    </article>
  );
}
