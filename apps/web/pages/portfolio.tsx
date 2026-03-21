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
import { formatCurrency } from "../shared/format";

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
    };
    shareClass: {
      referencePricePerShare: number;
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<PortfolioSummary>("/v1/portfolio/summary")
      .then((response) => setSummary(response.data))
      .catch((fetchError: any) =>
        setError(fetchError?.message || "Portfolio unavailable.")
      )
      .finally(() => setLoading(false));
  }, []);

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
            {summary.currentHoldings.map((holding) => (
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
              />
            ))}
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
          title="Demo briefing"
          subtitle="The backend already returns deterministic portfolio math, so later AI layers can consume this payload without moving calculation logic into the client."
          aside={<FutureBadge label="AI Insights" phase="PHASE_2_AI" />}
        />
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
              </div>
              <div className="dashboard-list-right">
                <strong>{formatCurrency(holding.estimatedValue)}</strong>
                <span className="muted">
                  Income {formatCurrency(holding.estimatedMonthlyIncome)} / mo
                </span>
              </div>
            </div>
          )}
        />
      </section>
    </main>
  );
}
