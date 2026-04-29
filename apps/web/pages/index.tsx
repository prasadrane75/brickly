import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch, getToken } from "../lib/api";
import { ActivityList } from "../components/dashboard/ActivityList";
import { HoldingCard } from "../components/dashboard/HoldingCard";
import { MetricCard } from "../components/ui/MetricCard";
import { PageHero } from "../components/ui/PageHero";
import { FutureBadge } from "../components/ui/FutureBadge";
import { AllocationBar } from "../components/ui/AllocationBar";
import { SectionHeader } from "../components/ui/SectionHeader";
import type { ApiResponse } from "../shared/api-types";
import {
  formatCurrency,
  formatDate,
  formatSignedCurrency,
} from "../shared/format";

type PortfolioSummary = ApiResponse<{
  user: {
    id: string;
    email: string | null;
    role: string;
  };
  summary: {
    totalPortfolioValue: number;
    totalInvestedAmount: number;
    totalUnrealizedChange: number;
    estimatedMonthlyIncome: number;
    estimatedAnnualIncome: number;
    distinctProperties: number;
    totalPositions: number;
    totalSharesOwned: number;
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
      aiInsightAvailable: boolean;
    };
  }>;
  allocationByProperty: Array<{
    propertyId: string;
    propertyName: string;
    marketValue: number;
    allocationPercent: number;
    verificationStatus: string;
  }>;
  recentTransactions: Array<{
    id: string;
    direction: "BUY" | "SELL";
    sharesTraded: number;
    totalAmount: number;
    tradedAt: string;
    property: { name: string; city: string; state: string };
  }>;
  openOrders: {
    buy: Array<{ id: string; status: string; sharesRequested: number; property: { name: string } }>;
    sell: Array<{ id: string; status: string; sharesForSale: number; property: { name: string } }>;
  };
  notificationsPreview: Array<{
    id: string;
    type: string;
    message: string;
    createdAt: string;
    readAt: string | null;
  }>;
}>;

export default function HomePage() {
  const [summary, setSummary] = useState<PortfolioSummary["data"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasToken, setHasToken] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = getToken();
    setHasToken(Boolean(token));
    if (!token) {
      setLoading(false);
      return;
    }

    apiFetch<PortfolioSummary>("/v1/portfolio/summary")
      .then((response) => setSummary(response.data))
      .catch((fetchError: any) =>
        setError(fetchError?.message || "Dashboard unavailable.")
      )
      .finally(() => setLoading(false));
  }, []);

  const orderPreview = summary
    ? [
        ...summary.openOrders.buy.map((order) => ({
          id: order.id,
          status: order.status,
          propertyName: order.property.name,
          quantityLabel: `${order.sharesRequested} shares`,
        })),
        ...summary.openOrders.sell.map((order) => ({
          id: order.id,
          status: order.status,
          propertyName: order.property.name,
          quantityLabel: `${order.sharesForSale} shares`,
        })),
      ].slice(0, 4)
    : [];

  if (!hasToken) {
    return (
      <main className="home-dashboard">
        <section className="home-hero home-hero-upgraded">
          <div className="home-hero-grid">
            <div className="home-hero-copy">
              <p className="home-kicker">Investor Demo Platform</p>
              <h1>Own real estate with a market-first operating system.</h1>
              <p className="home-hero-lead">
                Brickly is built to demo fractional property discovery,
                portfolio visibility, transactions, documents, and admin-grade
                controls in one clean workflow.
              </p>
              <div className="home-hero-actions">
                <Link href="/login" className="button">
                  Login to Demo
                </Link>
                <Link href="/properties" className="button secondary">
                  Browse Inventory
                </Link>
              </div>
            </div>
            <div className="home-spotlight-card">
              <div className="home-spotlight-header">
                <span className="home-spotlight-label">Phase 1</span>
                <FutureBadge label="AI Insights" phase="PHASE_2_AI" />
              </div>
              <h2>Operational core, demo ready</h2>
              <p>
                Core investing workflows are active today. AI insights and
                verified ownership are visibly reserved for later phases.
              </p>
              <div className="home-spotlight-list">
                <div>
                  <strong>Properties + Documents</strong>
                  <span>Asset overview, files, and transaction context</span>
                </div>
                <div>
                  <strong>Portfolio + Orders</strong>
                  <span>Holdings, allocations, orders, and transaction history</span>
                </div>
                <div>
                  <strong>Admin + Audit</strong>
                  <span>Operational review and auditable event history</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="screen-page">
        <PageHero
          eyebrow="Investor Dashboard"
          title="Loading your portfolio summary"
          description="Brickly is preparing the Phase 1 dashboard payload."
          actions={<FutureBadge label="AI Insights" phase="PHASE_2_AI" />}
        />
      </main>
    );
  }

  if (!summary) {
    return (
      <main className="screen-page">
        <PageHero
          eyebrow="Investor Dashboard"
          title="Dashboard unavailable"
          description={error || "The portfolio summary could not be loaded."}
          actions={<Link href="/properties" className="button secondary">Browse properties</Link>}
        />
      </main>
    );
  }

  return (
    <main className="dashboard-page">
      <PageHero
        eyebrow="Investor Dashboard"
        title={`Welcome back${summary.user.email ? `, ${summary.user.email}` : ""}`}
        description="A backend-driven portfolio summary shaped for dashboard cards today and narrative insights later."
        actions={
          <>
            <FutureBadge label="AI Insights" phase="PHASE_2_AI" />
            <FutureBadge label="Verified Ownership" phase="PHASE_3_BLOCKCHAIN" />
          </>
        }
      />

      <section className="dashboard-grid dashboard-metrics-grid">
        <MetricCard
          label="Portfolio Value"
          value={formatCurrency(summary.summary.totalPortfolioValue)}
          detail={`${summary.summary.totalPositions} positions across ${summary.summary.distinctProperties} properties`}
          accent="gold"
        />
        <MetricCard
          label="Estimated Yield"
          value={formatCurrency(summary.summary.estimatedAnnualIncome)}
          detail={`${formatCurrency(summary.summary.estimatedMonthlyIncome)} monthly income estimate`}
          accent="green"
        />
        <MetricCard
          label="Net Change"
          value={formatSignedCurrency(summary.summary.totalUnrealizedChange)}
          detail={`Invested capital ${formatCurrency(summary.summary.totalInvestedAmount)}`}
          accent="blue"
        />
      </section>

      <section className="dashboard-grid dashboard-main-grid">
        <div className="card dashboard-section">
          <SectionHeader
            eyebrow="Current Holdings"
            title="Portfolio positions"
            subtitle="Core ownership, value, and yield cards for the investor walkthrough."
            aside={
              <Link href="/portfolio" className="home-inline-link">
                Open portfolio
              </Link>
            }
          />
          <div className="dashboard-card-grid">
            {summary.currentHoldings.slice(0, 4).map((holding) => (
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
            eyebrow="Allocation Summary"
            title="By property"
            subtitle="Deterministic backend allocation values prepared for cards and charts."
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
          {/* PHASE_2_AI: portfolio narrative summaries should consume this allocation block without changing the payload shape. */}
        </aside>
      </section>

      <section className="dashboard-grid dashboard-secondary-grid">
        <div className="card dashboard-section">
          <SectionHeader
            title="Recent Transactions"
            subtitle="Latest completed trades across the current portfolio."
            aside={
              <Link href="/transactions" className="home-inline-link">
                View all
              </Link>
            }
          />
          <ActivityList
            items={summary.recentTransactions.slice(0, 4)}
            emptyTitle="No transactions yet"
            emptyDescription="Completed trades will appear here once the portfolio is active."
            renderItem={(transaction) => (
              <div key={transaction.id} className="dashboard-list-row">
                <div>
                  <strong>{transaction.property.name}</strong>
                  <p className="muted">
                    {transaction.direction} · {transaction.sharesTraded} shares
                  </p>
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
            title="Open Orders"
            subtitle="Current market intent and liquidity already visible in Phase 1."
            aside={
              <Link href="/orders" className="home-inline-link">
                Manage
              </Link>
            }
          />
          <ActivityList
            items={orderPreview}
            emptyTitle="No open orders"
            emptyDescription="Buy and sell intent will appear here when there is live order activity."
            renderItem={(order) => (
              <div key={order.id} className="dashboard-list-row">
                <div>
                  <strong>{order.propertyName}</strong>
                  <p className="muted">{order.status}</p>
                </div>
                <div className="dashboard-list-right">
                  <strong>{order.quantityLabel}</strong>
                </div>
              </div>
            )}
          />
        </div>

        <div className="card dashboard-section">
          <SectionHeader
            title="Notifications"
            subtitle="System events and portfolio activity previews for the investor inbox."
            aside={
              <Link href="/alerts" className="home-inline-link">
                Inbox
              </Link>
            }
          />
          <ActivityList
            items={summary.notificationsPreview}
            emptyTitle="No notifications"
            emptyDescription="Alerts and platform events will appear here."
            renderItem={(notification) => (
              <div key={notification.id} className="dashboard-list-row">
                <div>
                  <strong>{notification.type}</strong>
                  <p className="muted">{notification.message}</p>
                </div>
                <div className="dashboard-list-right">
                  <span className="muted">{formatDate(notification.createdAt)}</span>
                </div>
              </div>
            )}
          />
        </div>
      </section>
    </main>
  );
}
