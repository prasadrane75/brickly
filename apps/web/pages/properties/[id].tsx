import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../lib/api";
import type { ApiResponse, PaginatedResponse } from "../../shared/api-types";
import { ErrorState } from "../../components/ui/ErrorState";
import { LoadingState } from "../../components/ui/LoadingState";
import { PageHero } from "../../components/ui/PageHero";
import { MetricCard } from "../../components/ui/MetricCard";
import { SectionHeader } from "../../components/ui/SectionHeader";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { OwnershipHistory } from "../../components/blockchain/OwnershipHistory";
import {
  aiClient,
  type AiLiquidityInsightResult,
  type AiOwnershipSummaryResult,
} from "../../services/ai";
import { blockchainClient, type BlockchainVerificationSnapshot } from "../../services/blockchain";
import { formatBlockchainHash, formatCurrency, formatDate } from "../../shared/format";

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
  blockchainVerified?: boolean;
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
  verificationStatus: string;
  blockchainRef?: string | null;
  buyer?: { email?: string | null } | null;
  seller?: { email?: string | null } | null;
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
  const [verification, setVerification] = useState<BlockchainVerificationSnapshot | null>(null);
  const [ownershipSummary, setOwnershipSummary] = useState<AiOwnershipSummaryResult | null>(null);
  const [liquidityInsight, setLiquidityInsight] = useState<AiLiquidityInsightResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!propertyId) return;

    Promise.all([
      apiFetch<PropertyDetail>(`/v1/properties/${propertyId}`),
      apiFetch<TransactionRow>(`/v1/transactions?propertyId=${propertyId}&page=1&pageSize=8`),
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

    blockchainClient
      .getPropertyVerification(propertyId)
      .then((verificationData) => setVerification(verificationData))
      .catch(() => setVerification(null));

    aiClient
      .summarizeOwnership(propertyId)
      .then((summary) => setOwnershipSummary(summary))
      .catch(() => setOwnershipSummary(null));

    aiClient
      .explainLiquidity(propertyId)
      .then((insight) => setLiquidityInsight(insight))
      .catch(() => setLiquidityInsight(null));
  }, [propertyId]);

  const evidenceRows = useMemo(() => {
    if (!detail) return [];

    const documentRows = documents.map((document) => ({
      id: `document-${document.id}`,
      type: "Document",
      category: document.kind,
      title: document.fileName,
      status: document.verificationStatus,
      detail: `${document.status} · added ${formatDate(document.createdAt)}`,
      reference: "Open file",
      href: document.fileUrl,
    }));

    const transactionRows = transactions.map((transaction) => ({
      id: `transaction-${transaction.id}`,
      type: "Ownership",
      category: transaction.direction,
      title: `${transaction.sharesTraded} shares moved`,
      status: transaction.verificationStatus,
      detail: `${formatDate(transaction.tradedAt)} · ${formatCurrency(transaction.totalAmount)}`,
      reference: transaction.blockchainRef
        ? formatBlockchainHash(transaction.blockchainRef)
        : "Not recorded yet",
      href: null as string | null,
    }));

    const noteRows = [
      {
        id: "note-ai-layer",
        type: "Note",
        category: "AI",
        title: "AI insights stay additive",
        status: "Active add-on",
        detail:
          "Portfolio and document AI stay grounded in backend records so property data remains deterministic.",
        reference: "Operational source: Postgres",
        href: null as string | null,
      },
      {
        id: "note-proof-layer",
        type: "Note",
        category: "Blockchain",
        title: "Ownership proof remains optional",
        status:
          (verification?.verificationStatus || detail.verificationStatus) === "VERIFIED"
            ? "Verified"
            : "Optional",
        detail:
          "Blockchain augments the operational record with proof references without blocking the core marketplace flow.",
        reference: verification?.blockchainRef || detail.blockchainRef || "Proof pending",
        href: null as string | null,
      },
    ];

    return [...documentRows, ...transactionRows, ...noteRows];
  }, [detail, documents, transactions, verification]);

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
            <span className="badge subtle">
              {verification?.verificationStatus || detail.verificationStatus}
            </span>
            <span className="badge subtle">
              {detail.aiInsightAvailable ? "AI-ready asset" : "Operational detail"}
            </span>
            <span
              className={`badge ${
                (verification?.verificationStatus || detail.verificationStatus) === "VERIFIED"
                  ? "success"
                  : "subtle"
              }`}
            >
              {(verification?.verificationStatus || detail.verificationStatus) === "VERIFIED"
                ? "Ownership verified"
                : "Ownership pending"}
            </span>
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
          value={String(liquidityInsight?.liquidityScore ?? detail.liquidityScore)}
          detail={
            liquidityInsight
              ? `${liquidityInsight.demandIndicator} demand`
              : `${detail.counts.trades} completed trades tracked`
          }
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
            subtitle="Operational ownership with an optional blockchain proof layer."
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
                <span>{verification?.verificationStatus || detail.verificationStatus}</span>
              </div>
              <div className="dashboard-list-row">
                <strong>Blockchain reference</strong>
                <span>{verification?.blockchainRef || detail.blockchainRef || "Not recorded yet"}</span>
              </div>
            </div>
          ) : (
            <p className="muted">No share class configured.</p>
          )}
          {verification ? (
            <div className="property-verification-panel">
              <div className="property-verification-header">
                <span className={`badge ${verification.verificationStatus === "VERIFIED" ? "success" : "subtle"}`}>
                  {verification.verificationStatus === "VERIFIED"
                    ? "Blockchain-verified ownership"
                    : "Blockchain proof pending"}
                </span>
                <span className="muted">
                  {verification.provider} · {verification.network}
                </span>
              </div>
              <p className="muted">{verification.note}</p>
              <div className="dashboard-list">
                <div className="dashboard-list-row">
                  <strong>Latest proof</strong>
                  <span>
                    {formatBlockchainHash(
                      verification.latestRecord?.txHash || verification.blockchainRef || undefined
                    )}
                  </span>
                </div>
                <div className="dashboard-list-row">
                  <strong>Records tracked</strong>
                  <span>{verification.records.length}</span>
                </div>
                <div className="dashboard-list-row">
                  <strong>Contract</strong>
                  <span>{verification.contractAddress || "Not configured"}</span>
                </div>
              </div>
            </div>
          ) : null}
          {liquidityInsight ? (
            <div className="property-verification-panel">
              <div className="property-verification-header">
                <span className="badge success">Liquidity insight</span>
                <span className="muted">
                  {liquidityInsight.provider} · {liquidityInsight.model}
                </span>
              </div>
              <p>{liquidityInsight.explanation}</p>
              <div className="dashboard-list">
                <div className="dashboard-list-row">
                  <strong>Expected exit</strong>
                  <span>{liquidityInsight.expectedExitTime}</span>
                </div>
                <div className="dashboard-list-row">
                  <strong>Demand indicator</strong>
                  <span>{liquidityInsight.demandIndicator}</span>
                </div>
              </div>
            </div>
          ) : null}
        </aside>
      </section>

      <section className="dashboard-grid dashboard-main-grid">
        <div className="card dashboard-section">
          <SectionHeader
            eyebrow="Ownership Timeline"
            title="Transfer history"
            subtitle="Operational transfers with blockchain references where proof exists."
            aside={<span className="badge subtle">{transactions.length} events</span>}
          />
          <OwnershipHistory items={transactions} chainId={11155111} />
        </div>

        <aside className="card dashboard-section">
          <SectionHeader
            eyebrow="AI Ownership Summary"
            title="Cap table narrative"
            subtitle="Investor-friendly explanation grounded in ledger activity and proof references."
          />
          {ownershipSummary ? (
            <>
              <div className="dashboard-inline-badges">
                <span className="badge success">Verified Insight</span>
                <span className="badge subtle">{ownershipSummary.trustIndicator}</span>
              </div>
              <p>{ownershipSummary.summary}</p>
              <div className="dashboard-list">
                {ownershipSummary.currentOwnershipBreakdown.map((entry) => (
                  <div key={`${entry.holder}-${entry.sharesOwned}`} className="dashboard-list-row">
                    <strong>{entry.holder}</strong>
                    <span>
                      {entry.sharesOwned} shares · {entry.sharePercent.toFixed(1)}% ·{" "}
                      {entry.verified ? "verified" : "operational only"}
                    </span>
                  </div>
                ))}
              </div>
              {ownershipSummary.majorChanges.length ? (
                <div className="dashboard-list">
                  {ownershipSummary.majorChanges.map((change) => (
                    <div key={change} className="dashboard-list-row">
                      <strong>Major change</strong>
                      <span>{change}</span>
                    </div>
                  ))}
                </div>
              ) : null}
            </>
          ) : (
            <p className="muted">AI ownership narrative is unavailable for this asset right now.</p>
          )}
        </aside>
      </section>

      <section className="card dashboard-section">
        <SectionHeader
          title="Evidence and history"
          subtitle="Documents, ownership movements, and investor-demo notes are consolidated into one operational table."
          aside={<span className="badge subtle">{evidenceRows.length} records</span>}
        />
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Category</th>
                <th>Record</th>
                <th>Status</th>
                <th>Detail</th>
                <th>Reference</th>
              </tr>
            </thead>
            <tbody>
              {evidenceRows.map((row) => (
                <tr key={row.id}>
                  <td>{row.type}</td>
                  <td>{row.category}</td>
                  <td>{row.title}</td>
                  <td>
                    <span
                      className={`badge ${
                        row.status === "VERIFIED" || row.status === "Verified"
                          ? "success"
                          : "subtle"
                      }`}
                    >
                      {row.status}
                    </span>
                  </td>
                  <td>{row.detail}</td>
                  <td>
                    {row.href ? (
                      <a href={row.href} className="home-inline-link" target="_blank" rel="noreferrer">
                        {row.reference}
                      </a>
                    ) : (
                      row.reference
                    )}
                  </td>
                </tr>
              ))}
              {evidenceRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="muted">
                    No evidence records available yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
