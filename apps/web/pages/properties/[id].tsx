import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { apiFetch } from "../../lib/api";
import type { ApiResponse, PaginatedResponse } from "../../shared/api-types";
import { ActivityList } from "../../components/dashboard/ActivityList";
import { ErrorState } from "../../components/ui/ErrorState";
import { LoadingState } from "../../components/ui/LoadingState";
import { PageHero } from "../../components/ui/PageHero";
import { FutureBadge } from "../../components/ui/FutureBadge";
import { MetricCard } from "../../components/ui/MetricCard";
import { SectionHeader } from "../../components/ui/SectionHeader";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { formatCurrency, formatDate } from "../../shared/format";

type PropertyDetail = ApiResponse<{
  id: string;
  address1: string;
  city: string;
  state: string;
  zip: string;
  status: string;
  type: string;
  targetRaise: number | null;
  estMonthlyRent: number | null;
  liquidityScore: number;
  aiInsightAvailable?: boolean;
  blockchainRef?: string | null;
  counts: { trades: number; documents: number };
  images: Array<{ id: string; url: string }>;
  shareClass: {
    totalShares: number;
    sharesAvailable: number;
    referencePricePerShare: number;
  } | null;
  documents: Array<{
    id: string;
    fileName: string;
    fileUrl: string;
    kind: string;
    verificationStatus: string;
  }>;
  verificationStatus: string;
}>;

type TransactionRow = PaginatedResponse<{
  id: string;
  direction: "BUY" | "SELL";
  sharesTraded: number;
  totalAmount: number;
  tradedAt: string;
}>;

type DocumentRow = PaginatedResponse<{
  id: string;
  fileName: string;
  kind: string;
  status: string;
  verificationStatus: string;
  createdAt: string;
  fileUrl: string;
}>;

export default function PropertyDetailPage() {
  const router = useRouter();
  const propertyId = typeof router.query.id === "string" ? router.query.id : "";
  const [detail, setDetail] = useState<PropertyDetail["data"] | null>(null);
  const [transactions, setTransactions] = useState<TransactionRow["data"]>([]);
  const [documents, setDocuments] = useState<DocumentRow["data"]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!propertyId) return;

    Promise.all([
      apiFetch<PropertyDetail>(`/v1/properties/${propertyId}`),
      apiFetch<TransactionRow>(`/v1/transactions?propertyId=${propertyId}&page=1&pageSize=4`),
      apiFetch<DocumentRow>(`/v1/documents?propertyId=${propertyId}&page=1&pageSize=4`),
    ])
      .then(([property, transactionData, documentData]) => {
        setDetail(property.data);
        setTransactions(transactionData.data);
        setDocuments(documentData.data);
      })
      .catch((fetchError: any) =>
        setError(fetchError?.message || "Property detail could not be loaded.")
      );
  }, [propertyId]);

  if (!detail && !error) {
    return (
      <LoadingState
        title="Loading property"
        description="Preparing the property overview, documents, and transaction preview."
      />
    );
  }

  if (!detail) {
    return <ErrorState title="Property unavailable" message={error || "Property data could not be loaded."} />;
  }

  return (
    <main className="screen-page">
      <PageHero
        eyebrow="Property Detail"
        title={detail.address1}
        description={`${detail.city}, ${detail.state} ${detail.zip}`}
        actions={
          <>
            <span className="badge subtle">{detail.verificationStatus}</span>
            <FutureBadge label="AI Insights" phase="PHASE_2_AI" />
            <FutureBadge label="Verified Ownership" phase="PHASE_3_BLOCKCHAIN" />
          </>
        }
      />

      <section className="dashboard-grid dashboard-metrics-grid">
        <MetricCard
          label="Valuation"
          value={formatCurrency(detail.targetRaise)}
          detail={`Property type: ${detail.type}`}
          accent="gold"
        />
        <MetricCard
          label="Yield Estimate"
          value={formatCurrency(detail.estMonthlyRent)}
          detail="Estimated monthly income potential"
          accent="green"
        />
        <MetricCard
          label="Liquidity Score"
          value={String(detail.liquidityScore)}
          detail={`${detail.counts.trades} completed trades tracked`}
          accent="blue"
        />
      </section>

      <section className="dashboard-grid dashboard-main-grid">
        <div className="card dashboard-section">
          <SectionHeader
            eyebrow="Property Overview"
            title="Asset presentation"
            subtitle="Core asset metadata, media, and investor-facing detail for the demo."
            aside={
              <Link href="/properties" className="home-inline-link">
                Back to properties
              </Link>
            }
          />
          <div className="property-detail-gallery">
            {detail.images.length ? (
              detail.images.map((image) => (
                <img key={image.id} src={image.url} alt={detail.address1} />
              ))
            ) : (
              <div className="property-card-placeholder property-detail-placeholder">
                No gallery images
              </div>
            )}
          </div>
          <div className="dashboard-inline-badges">
            <StatusBadge value={detail.type} tone="default" />
            <StatusBadge value={detail.status} />
            <span className="badge subtle">{detail.counts.documents} documents</span>
          </div>
          {/* PHASE_2_AI: future asset summaries should read from this same detail payload, not recalculate property metrics in the client. */}
        </div>

        <aside className="card dashboard-section">
          <SectionHeader
            eyebrow="Ownership"
            title="Cap table snapshot"
            subtitle="Phase 1 ownership math with space reserved for later verification references."
          />
          {detail.shareClass ? (
            <div className="dashboard-list">
              <div className="dashboard-list-row">
                <strong>Total shares</strong>
                <span>{detail.shareClass.totalShares}</span>
              </div>
              <div className="dashboard-list-row">
                <strong>Available shares</strong>
                <span>{detail.shareClass.sharesAvailable}</span>
              </div>
              <div className="dashboard-list-row">
                <strong>Reference price</strong>
                <span>{formatCurrency(detail.shareClass.referencePricePerShare)}</span>
              </div>
              <div className="dashboard-list-row">
                <strong>Verification status</strong>
                <span>{detail.verificationStatus}</span>
              </div>
            </div>
          ) : (
            <p className="muted">No share class configured.</p>
          )}
          {/* PHASE_3_BLOCKCHAIN: add verified cap-table evidence and blockchainRef references here. */}
        </aside>
      </section>

      <section className="dashboard-grid dashboard-secondary-grid">
        <div className="card dashboard-section">
          <SectionHeader
            title="Documents"
            subtitle="Attached property and transaction diligence records."
            aside={<span className="badge subtle">{detail.counts.documents} total</span>}
          />
          <ActivityList
            items={documents}
            emptyTitle="No documents"
            emptyDescription="Uploaded diligence files will appear here."
            renderItem={(document) => (
              <div key={document.id} className="dashboard-list-row">
                <div>
                  <strong>{document.fileName}</strong>
                  <p className="muted">
                    {document.kind} · {document.status}
                  </p>
                </div>
                <div className="dashboard-list-right">
                  <span className="badge subtle">{document.verificationStatus}</span>
                  <a href={document.fileUrl} className="home-inline-link" target="_blank" rel="noreferrer">
                    Open
                  </a>
                </div>
              </div>
            )}
          />
        </div>

        <div className="card dashboard-section">
          <SectionHeader
            title="Transaction Preview"
            subtitle="Recent property-specific transfer and purchase history."
            aside={<span className="badge subtle">{detail.counts.trades} total</span>}
          />
          <ActivityList
            items={transactions}
            emptyTitle="No transaction history"
            emptyDescription="Completed buys and sells will appear here."
            renderItem={(transaction) => (
              <div key={transaction.id} className="dashboard-list-row">
                <div>
                  <strong>{transaction.direction}</strong>
                  <p className="muted">{transaction.sharesTraded} shares transferred</p>
                </div>
                <div className="dashboard-list-right">
                  <strong>{formatCurrency(transaction.totalAmount)}</strong>
                  <span className="muted">{formatDate(transaction.tradedAt)}</span>
                </div>
              </div>
            )}
          />
        </div>

        <div className="card dashboard-section">
          <SectionHeader
            title="Investor demo notes"
            subtitle="Reserved placeholders for later blockchain and AI layers."
          />
          <div className="dashboard-list">
            <div className="dashboard-list-row">
              <div>
                <strong>AI Insights</strong>
                <p className="muted">Property narratives and diligence summaries are not active in Phase 1.</p>
              </div>
              <FutureBadge label="PHASE_2_AI" phase="PHASE_2_AI" />
            </div>
            <div className="dashboard-list-row">
              <div>
                <strong>Verified Ownership</strong>
                <p className="muted">Ownership attestation and blockchain references are intentionally deferred.</p>
              </div>
              <FutureBadge label="PHASE_3_BLOCKCHAIN" phase="PHASE_3_BLOCKCHAIN" />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
