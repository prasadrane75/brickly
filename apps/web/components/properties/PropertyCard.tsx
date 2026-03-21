import Link from "next/link";
import { formatCurrency } from "../../shared/format";

type PropertyCardProps = {
  id: string;
  title: string;
  location: string;
  status: string;
  valuation: number | null;
  monthlyIncomeEstimate: number | null;
  thumbnailUrl: string | null;
  verificationStatus: string;
  documentCount: number;
};

export function PropertyCard({
  id,
  title,
  location,
  status,
  valuation,
  monthlyIncomeEstimate,
  thumbnailUrl,
  verificationStatus,
  documentCount,
}: PropertyCardProps) {
  return (
    <article className="property-card">
      <div className="property-card-media">
        {thumbnailUrl ? (
          <img src={thumbnailUrl} alt={title} />
        ) : (
          <div className="property-card-placeholder">No image</div>
        )}
      </div>
      <div className="property-card-body">
        <div className="dashboard-holding-head">
          <strong>{title}</strong>
          <span className="badge">{status}</span>
        </div>
        <p className="muted">{location}</p>
        <div className="property-card-metrics">
          <span>Valuation {formatCurrency(valuation)}</span>
          <span>Yield est. {formatCurrency(monthlyIncomeEstimate)}</span>
        </div>
        <div className="dashboard-inline-badges">
          <span className="badge subtle">{verificationStatus}</span>
          <span className="badge subtle">{documentCount} docs</span>
        </div>
        <Link href={`/properties/${id}`} className="home-inline-link">
          View detail
        </Link>
      </div>
    </article>
  );
}
