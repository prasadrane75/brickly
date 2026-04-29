import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../lib/api";

type Property = {
  id: string;
  address1: string;
  city: string;
  state: string;
  liquidityScore?: number;
};

type SellOrder = {
  id: string;
  propertyId: string;
  status: "OPEN" | "PARTIAL" | "FILLED" | "CANCELLED";
};

type MarketRules = {
  liquidityGoodThreshold: number;
  liquidityMidThreshold: number;
};

type LiquidityTrendPoint = {
  date: string;
  score: number;
};

type LiquiditySummary = {
  avgLiquidityScore: number;
  dailyTradeVolume: number;
  avgBidAskSpread: number;
  openSellOrders: number;
  activeBuyOrders: number;
};

const healthDefaults = [
  { label: "Active Buy Orders", value: "0" },
  { label: "Pending Sell Orders", value: "0" },
  { label: "Avg Fill Rate", value: "74%" },
  { label: "Avg Price Deviation", value: "4.1%" },
];

function scoreTone(score: number, rules?: MarketRules) {
  const good = rules?.liquidityGoodThreshold ?? 70;
  const mid = rules?.liquidityMidThreshold ?? 50;
  if (score >= good) return "good";
  if (score >= mid) return "mid";
  return "low";
}

export default function AdminLiquidityPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [sellOrders, setSellOrders] = useState<SellOrder[]>([]);
  const [rules, setRules] = useState<MarketRules | null>(null);
  const [trend, setTrend] = useState<LiquidityTrendPoint[]>([]);
  const [summary, setSummary] = useState<LiquiditySummary | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      apiFetch<Property[]>("/properties"),
      apiFetch<SellOrder[]>("/market/sell-orders"),
      apiFetch<MarketRules>("/admin/market-rules"),
      apiFetch<LiquidityTrendPoint[]>("/admin/liquidity/trend"),
      apiFetch<LiquiditySummary>("/admin/liquidity/summary"),
    ])
      .then(([propertyData, orderData, rulesData, trendData, summaryData]) => {
        setProperties(propertyData);
        setSellOrders(orderData);
        setRules(rulesData);
        setTrend(trendData);
        setSummary(summaryData);
      })
      .catch((error) => setMessage(error.message || "Failed to load properties."));
  }, []);

  const flagged = useMemo(() => {
    const openOrders = sellOrders.filter((order) =>
      ["OPEN", "PARTIAL"].includes(order.status)
    );
    const orderCounts = openOrders.reduce<Record<string, number>>(
      (acc, order) => {
        acc[order.propertyId] = (acc[order.propertyId] ?? 0) + 1;
        return acc;
      },
      {}
    );

    return properties
      .filter((property) => orderCounts[property.id])
      .sort((a, b) => (b.liquidityScore ?? 0) - (a.liquidityScore ?? 0))
      .map((property, index) => ({
        id: property.id,
        property: property.address1,
        score: property.liquidityScore ?? 50,
        spread: `${(3 + index * 0.6).toFixed(1)}%`,
        timeToFill: `${10 + index * 2}d`,
        openOrders: orderCounts[property.id] ?? 0,
      }));
  }, [properties, sellOrders]);

  const trendValues = useMemo(() => {
    if (!trend.length) {
      return Array.from({ length: 7 }, (_, idx) => ({
        date: `Day ${idx + 1}`,
        score: 0,
      }));
    }
    return trend.map((point) => ({
      date: point.date,
      score: point.score,
    }));
  }, [trend]);

  const kpis = useMemo(() => {
    const avgLiquidity = summary?.avgLiquidityScore ?? 0;
    const dailyVolume = summary?.dailyTradeVolume ?? 0;
    const avgSpread = summary?.avgBidAskSpread ?? 0;
    const openOrders = summary?.openSellOrders ?? 0;
    return [
      { label: "Avg Liquidity Score", value: `${avgLiquidity}` },
      {
        label: "Daily Trade Volume",
        value: `$${dailyVolume.toLocaleString(undefined, {
          maximumFractionDigits: 0,
        })}`,
      },
      { label: "Avg Bid-Ask Spread", value: `${avgSpread.toFixed(1)}%` },
      { label: "Open Sell Orders", value: `${openOrders}` },
    ];
  }, [summary]);

  const health = useMemo(() => {
    if (!summary) return healthDefaults;
    return [
      {
        label: "Active Buy Orders",
        value: `${summary.activeBuyOrders}`,
      },
      {
        label: "Pending Sell Orders",
        value: `${summary.openSellOrders}`,
      },
      { label: "Avg Fill Rate", value: "74%" },
      { label: "Avg Price Deviation", value: "4.1%" },
    ];
  }, [summary]);
  return (
    <main className="liquidity-page">
      <section className="liquidity-header">
        <div>
          <h1>Liquidity Dashboard</h1>
          <p>Monitor market health and identify liquidity risks.</p>
        </div>
        <div className="liquidity-actions">
          <button
            className="import-secondary"
            onClick={async () => {
              setMessage(null);
              try {
                await apiFetch("/admin/liquidity/recompute-all", {
                  method: "POST",
                });
                setMessage("Recomputed metrics for flagged properties.");
              } catch (error: any) {
                setMessage(error.message || "Failed to recompute metrics.");
              }
            }}
          >
            Recompute Metrics
          </button>
          <button className="import-primary">Send Buyer Alerts</button>
        </div>
      </section>

      <section className="liquidity-kpis">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="liquidity-card">
            <p className="muted">{kpi.label}</p>
            <h2>{kpi.value}</h2>
          </div>
        ))}
      </section>
      {message && <p className="status-error">{message}</p>}

      <section className="liquidity-grid">
        <div className="liquidity-card">
          <h2 className="liquidity-section-title">Flagged Properties</h2>
          <table className="liquidity-table">
            <thead>
              <tr>
                <th>Property</th>
                <th>Liquidity</th>
                <th>Spread</th>
                <th>Avg Time-to-Fill</th>
                <th>Open Orders</th>
                <th className="action-cell">Action</th>
              </tr>
            </thead>
            <tbody>
              {flagged.map((row) => (
                <tr key={row.id}>
                  <td>{row.property}</td>
                  <td>
                    <span className={`liquidity-badge ${scoreTone(row.score, rules ?? undefined)}`}>
                      {row.score}
                    </span>
                  </td>
                  <td>{row.spread}</td>
                  <td>{row.timeToFill}</td>
                  <td>{row.openOrders}</td>
                  <td className="action-cell">
                    <a className="import-secondary" href={`/admin/liquidity/${row.id}`}>
                      Review
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <aside className="liquidity-card">
          <h2 className="liquidity-section-title">Liquidity Overview</h2>
          <div className="liquidity-trend">
            {trendValues.map((point, index) => (
              <div key={`${point.date}-${index}`} className="trend-bar">
                <div
                  className="trend-fill"
                  style={{ height: `${point.score}%` }}
                />
                <span>{point.score}</span>
              </div>
            ))}
          </div>
          <div className="liquidity-divider" />
          <h3 className="liquidity-subtitle">Market Health Indicators</h3>
          <div className="liquidity-health">
            {health.map((row) => (
              <div key={row.label} className="health-row">
                <span className="muted">{row.label}</span>
                <strong>{row.value}</strong>
              </div>
            ))}
          </div>
        </aside>
      </section>
    </main>
  );
}
