import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
import type { ApiResponse } from "../shared/api-types";
import { ActivityList } from "../components/dashboard/ActivityList";
import { HoldingCard } from "../components/dashboard/HoldingCard";
import { PageHero } from "../components/ui/PageHero";
import { MetricCard } from "../components/ui/MetricCard";
import { AllocationBar } from "../components/ui/AllocationBar";
import { FutureBadge } from "../components/ui/FutureBadge";
import { SectionHeader } from "../components/ui/SectionHeader";
import { ErrorState } from "../components/ui/ErrorState";
import { LoadingState } from "../components/ui/LoadingState";
import { buildExplorerHref, formatBlockchainHash, formatCurrency } from "../shared/format";
import { aiClient, type AiSummaryResult } from "../services/ai";

type PortfolioSummary = ApiResponse<{
  summary: {
    totalPortfolioValue: number;
    totalInvestedAmount: number;
    totalUnrealizedChange: number;
    estimatedAnnualIncome: number;
  };
  currentHoldings: Array<{
    id: string;
    sharesOwned: number;
    estimatedValue: number;
    estimatedMonthlyIncome: number;
    allocationWeight: number;
    property: {
      id: string;
      name: string;
      city: string;
      state: string;
      status: string;
      thumbnailUrl: string | null;
      verificationStatus: string;
      blockchainRef?: string | null;
      blockchainVerified?: boolean;
    };
    shareClass: {
      referencePricePerShare: number;
    };
  }>;
  recentTransactions: Array<{
    id: string;
    direction: "BUY" | "SELL";
    tradedAt: string;
    verificationStatus: string;
    blockchainRef?: string | null;
    blockchainVerified?: boolean;
    property: {
      id: string;
    };
  }>;
  allocationByProperty: Array<{
    propertyId: string;
    propertyName: string;
    marketValue: number;
    allocationPercent: number;
  }>;
}>;

export default function PortfolioPage() {
  const [summary, setSummary] = useState<PortfolioSummary["data"] | null>(null);
  const [aiSummary, setAiSummary] = useState<AiSummaryResult | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      apiFetch<PortfolioSummary>("/v1/portfolio/summary"),
      aiClient.summarizePortfolio().catch((fetchError: any) => {
        setAiError(fetchError?.message || "AI summary unavailable.");
        return null;
      }),
    ])
      .then(([response, generatedSummary]) => {
        setSummary(response.data);
        setAiSummary(generatedSummary);
      })
      .catch((fetchError: any) =>
        setError(fetchError?.message || "Portfolio unavailable.")
      )
      .finally(() => setLoading(false));
  }, []);

  async function refreshAiSummary() {
    setAiLoading(true);
    setAiError(null);

    try {
      const nextSummary = await aiClient.summarizePortfolio();
      setAiSummary(nextSummary);
    } catch (fetchError: any) {
      setAiError(fetchError?.message || "AI summary unavailable.");
    } finally {
      setAiLoading(false);
    }
  }

  if (!summary && loading) {
    return <LoadingState title="Loading portfolio" description="Fetching positions, allocation, and income estimates." />;
  }

  if (!summary) {
    return <ErrorState title="Portfolio unavailable" message={error || "Portfolio data could not be loaded."} />;
  }

  return (
    <main className="screen-page">
      <PageHero
        eyebrow="Portfolio"
        title="Investor portfolio overview"
        description="Stable backend-driven positions, valuations, and allocation data for demo cards and charts."
        actions={<FutureBadge label="AI Insights" phase="PHASE_2_AI" />}
      />

      <section className="dashboard-grid dashboard-metrics-grid">
        <MetricCard label="Portfolio Value" value={formatCurrency(summary.summary.totalPortfolioValue)} />
        <MetricCard label="Invested Amount" value={formatCurrency(summary.summary.totalInvestedAmount)} accent="gold" />
        <MetricCard label="Annual Income" value={formatCurrency(summary.summary.estimatedAnnualIncome)} accent="green" />
        <MetricCard
          label="Trust Score"
          value={aiSummary ? `${aiSummary.trustScore}/100` : "Pending"}
          detail={
            aiSummary
              ? `${aiSummary.verificationCoverage}% verification coverage`
              : "Generated from holdings and blockchain-backed activity"
          }
          accent="blue"
        />
      </section>

      <section className="dashboard-grid dashboard-main-grid">
        <div className="card dashboard-section">
          <SectionHeader
            eyebrow="Current Portfolio"
            title="Holdings"
            subtitle="Investor positions across the currently owned property set."
            aside={<span className="badge subtle">{summary.currentHoldings.length} positions</span>}
          />
          <div className="dashboard-card-grid">
            {summary.currentHoldings.map((holding) => {
              const latestBuyForProperty = summary.recentTransactions.find(
                (transaction) =>
                  transaction.property.id === holding.property.id &&
                  transaction.direction === "BUY"
              );

              const proofLabel = holding.property.blockchainVerified
                ? "Property verified"
                : latestBuyForProperty?.blockchainVerified
                  ? "Verified acquisition transfer"
                  : latestBuyForProperty?.verificationStatus
                    ? `Transfer ${latestBuyForProperty.verificationStatus.toLowerCase()}`
                    : "Property proof pending";

              const proofRef = latestBuyForProperty?.blockchainRef || holding.property.blockchainRef;

              return (
                <HoldingCard
                  key={holding.id}
                  propertyName={holding.property.name}
                  location={`${holding.property.city}, ${holding.property.state}`}
                  status={holding.property.status}
                  sharesOwned={holding.sharesOwned}
                  estimatedValue={holding.estimatedValue}
                  estimatedMonthlyIncome={holding.estimatedMonthlyIncome}
                  allocationWeight={holding.allocationWeight}
                  verificationStatus={holding.property.verificationStatus}
                  blockchainRef={holding.property.blockchainRef}
                  blockchainVerified={holding.property.blockchainVerified}
                  proofLabel={proofLabel}
                  proofRef={proofRef}
                />
              );
            })}
          </div>
        </div>

        <aside className="card dashboard-section">
          <SectionHeader
            eyebrow="Allocation"
            title="By property"
            subtitle="Portfolio concentration bars shaped for frontend chart widgets."
          />
          <div className="allocation-list">
            {summary.allocationByProperty.map((item) => (
              <AllocationBar
                key={item.propertyId}
                label={item.propertyName}
                valueLabel={`${item.allocationPercent.toFixed(1)}%`}
                percent={item.allocationPercent}
              />
            ))}
          </div>
          {/* PHASE_2_AI: narrative portfolio concentration and diversification widgets will attach here later. */}
        </aside>
      </section>

      <section className="card dashboard-section">
        <SectionHeader
          eyebrow="Portfolio Notes"
          title="AI briefing"
          subtitle="Generated from the backend portfolio payload so the narrative stays tied to the same valuation and allocation data shown elsewhere on the page."
          aside={
            <button className="button secondary" type="button" onClick={refreshAiSummary} disabled={aiLoading}>
              {aiLoading ? "Refreshing..." : "Refresh AI Summary"}
            </button>
          }
        />
        {aiSummary ? <p>{aiSummary.summary}</p> : null}
        {aiSummary ? (
          <div className="dashboard-grid dashboard-metrics-grid">
            <MetricCard
              label="Verification Coverage"
              value={`${aiSummary.verificationCoverage}%`}
              detail={`${aiSummary.verifiedVsUnverified.verified} verified holdings`}
              accent="green"
            />
            <MetricCard
              label="Verified Positions"
              value={String(aiSummary.verifiedVsUnverified.verified)}
              detail={`${aiSummary.verifiedVsUnverified.unverified} pending proof`}
            />
            <MetricCard
              label="Insight Status"
              value={aiSummary.source === "generated" ? "Verified Insight" : "Fallback"}
              detail="AI reads the same portfolio payload shown on this page"
              accent="gold"
            />
          </div>
        ) : null}
        {aiSummary?.riskNotes.length ? (
          <div className="dashboard-list">
            {aiSummary.riskNotes.map((note) => (
              <div key={note} className="dashboard-list-row">
                <strong>Risk note</strong>
                <span>{note}</span>
              </div>
            ))}
          </div>
        ) : null}
        {aiSummary ? (
          <p className="muted">
            Source: {aiSummary.provider} · model {aiSummary.model} · generated{" "}
            {new Date(aiSummary.cachedAt).toLocaleString()}
          </p>
        ) : null}
        {aiError ? <p className="status-error">{aiError}</p> : null}
        {!aiSummary ? (
          <ActivityList
            items={summary.currentHoldings.slice(0, 3)}
            emptyTitle="No holdings"
            emptyDescription="Holdings insights will appear here once positions exist."
            renderItem={(holding) => (
              <div key={holding.id} className="dashboard-list-row">
                <div>
                  <strong>{holding.property.name}</strong>
                  <p className="muted">
                    {holding.sharesOwned} shares · reference{" "}
                    {formatCurrency(holding.shareClass.referencePricePerShare)} per share
                  </p>
                  <p className="muted">
                    {holding.property.blockchainVerified ? "Property verified" : "Property proof pending"}
                    {holding.property.blockchainRef ? ` · ${formatBlockchainHash(holding.property.blockchainRef)}` : ""}
                  </p>
                </div>
                <div className="dashboard-list-right">
                  <strong>{formatCurrency(holding.estimatedValue)}</strong>
                  <span className="muted">
                    Income {formatCurrency(holding.estimatedMonthlyIncome)} / mo
                  </span>
                  {buildExplorerHref(holding.property.blockchainRef, 11155111) ? (
                    <a
                      href={buildExplorerHref(holding.property.blockchainRef, 11155111)!}
                      className="home-inline-link"
                      target="_blank"
                      rel="noreferrer"
                    >
                      View proof
                    </a>
                  ) : null}
                </div>
              </div>
            )}
          />
        ) : null}
      </section>
    </main>
  );
}
