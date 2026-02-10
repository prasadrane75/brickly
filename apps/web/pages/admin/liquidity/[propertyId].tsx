import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { apiFetch } from "../../../lib/api";

type LiquidityDetail = {
  property: {
    id: string;
    address1: string;
    city: string;
    state: string;
    zip: string;
    liquidityScore: number;
    lastTradeAt: string | null;
    referencePricePerShare: number | null;
  };
  sellOrders: {
    id: string;
    remainingShares: number;
    askPricePerShare: number;
    optimizedPricePerShare: number | null;
    strategy: string;
    createdAt: string;
  }[];
  trades: {
    id: string;
    sharesTraded: number;
    pricePerShare: number;
    tradedAt: string;
    buyerUserId: string;
    sellerUserId: string;
  }[];
};

type MatchPreview = {
  matches: {
    buyOrderId: string;
    sellOrderId: string;
    shares: number;
    pricePerShare: number;
  }[];
  buyOrders: {
    id: string;
    orderType: "MARKET" | "LIMIT";
    maxPricePerShare: number | null;
    remainingShares: number;
  }[];
  sellOrders: {
    id: string;
    askPricePerShare: number;
    remainingShares: number;
  }[];
};

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString();
}

export default function AdminLiquidityDetailPage() {
  const router = useRouter();
  const propertyId = useMemo(() => {
    const raw = router.query.propertyId;
    return typeof raw === "string" ? raw : "";
  }, [router.query.propertyId]);

  const [detail, setDetail] = useState<LiquidityDetail | null>(null);
  const [preview, setPreview] = useState<MatchPreview | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  async function loadDetail() {
    if (!propertyId) return;
    setLoading(true);
    setMessage(null);
    try {
      const [data, matchPreview] = await Promise.all([
        apiFetch<LiquidityDetail>(`/admin/liquidity/${propertyId}`),
        apiFetch<MatchPreview>(`/admin/match/preview?propertyId=${propertyId}`),
      ]);
      setDetail(data);
      setPreview(matchPreview);
    } catch (error: any) {
      setMessage(error.message || "Failed to load liquidity details.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!router.isReady) return;
    void loadDetail();
  }, [router.isReady, propertyId]);

  async function handleRecompute() {
    if (!propertyId) return;
    setRunning(true);
    setMessage(null);
    try {
      await apiFetch(`/admin/liquidity/recompute?propertyId=${propertyId}`, {
        method: "POST",
      });
      setMessage("Metrics recomputed.");
      await loadDetail();
    } catch (error: any) {
      setMessage(error.message || "Failed to recompute metrics.");
    } finally {
      setRunning(false);
    }
  }

  async function handleTargeting(sellOrderId: string) {
    setRunning(true);
    setMessage(null);
    try {
      await apiFetch(`/admin/targeting/run?sellOrderId=${sellOrderId}`, {
        method: "POST",
      });
      setMessage("Buyer alerts sent.");
    } catch (error: any) {
      setMessage(error.message || "Failed to send alerts.");
    } finally {
      setRunning(false);
    }
  }

  async function handleMatch() {
    if (!propertyId) return;
    setRunning(true);
    setMessage(null);
    try {
      const result = await apiFetch<{ tradesCreated: number }>(
        `/admin/match/run?propertyId=${propertyId}`,
        { method: "POST" }
      );
      setMessage(`Matched ${result.tradesCreated} trades.`);
      const matchPreview = await apiFetch<MatchPreview>(
        `/admin/match/preview?propertyId=${propertyId}`
      );
      setPreview(matchPreview);
      await loadDetail();
    } catch (error: any) {
      setMessage(error.message || "Failed to match orders.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <main className="liquidity-page">
      <section className="liquidity-header">
        <div>
          <h1>Liquidity Detail</h1>
          <p>Property-level liquidity and trading insights.</p>
        </div>
        <div className="liquidity-actions">
          <button
            className="import-secondary"
            disabled={running}
            onClick={handleRecompute}
          >
            Recompute Metrics
          </button>
        </div>
      </section>

      {loading && <p className="muted">Loading...</p>}
      {message && <p className="status-success">{message}</p>}

      {detail && (
        <>
          <section className="liquidity-kpis">
            <div className="liquidity-card">
              <p className="muted">Reference Price / Share</p>
              <h2>
                {detail.property.referencePricePerShare
                  ? `$${detail.property.referencePricePerShare}`
                  : "—"}
              </h2>
            </div>
            <div className="liquidity-card">
              <p className="muted">Liquidity Score</p>
              <h2>{detail.property.liquidityScore}</h2>
            </div>
            <div className="liquidity-card">
              <p className="muted">Last Trade</p>
              <h2>{formatDate(detail.property.lastTradeAt)}</h2>
            </div>
          </section>

          <section className="liquidity-grid">
            <div className="liquidity-card">
              <h2 className="liquidity-section-title">Open Sell Orders</h2>
              <table className="liquidity-table">
                <thead>
                  <tr>
                    <th>Remaining</th>
                    <th>Ask</th>
                    <th>Optimized</th>
                    <th>Strategy</th>
                    <th className="action-cell">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.sellOrders.map((order) => (
                    <tr key={order.id}>
                      <td>{order.remainingShares}</td>
                      <td>${order.askPricePerShare}</td>
                      <td>
                        {order.optimizedPricePerShare
                          ? `$${order.optimizedPricePerShare}`
                          : "—"}
                      </td>
                      <td>{order.strategy}</td>
                      <td className="action-cell">
                        <button
                          className="import-secondary"
                          onClick={() => handleTargeting(order.id)}
                          disabled={running}
                        >
                          Send Buyer Alerts
                        </button>
                      </td>
                    </tr>
                  ))}
                  {detail.sellOrders.length === 0 && (
                    <tr>
                      <td colSpan={5} className="muted">
                        No open sell orders.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <aside className="liquidity-card">
              <h2 className="liquidity-section-title">Recommended Actions</h2>
              <ul className="liquidity-list">
                <li>
                  Consider enabling <strong>FAST_EXIT</strong> for open orders to
                  improve fill rate.
                </li>
                <li>
                  Send targeted alerts to top buyers to improve liquidity.
                </li>
              </ul>
            </aside>
          </section>

          <section className="liquidity-card">
            <h2 className="liquidity-section-title">Recent Trades</h2>
            <table className="liquidity-table">
              <thead>
                <tr>
                  <th>Property</th>
                  <th>Shares</th>
                  <th>Price</th>
                  <th>Traded At</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {detail.trades.map((trade) => (
                  <tr key={trade.id}>
                    <td>
                      {detail.property.address1}, {detail.property.city}
                    </td>
                    <td>{trade.sharesTraded}</td>
                    <td>${trade.pricePerShare}</td>
                    <td>{formatDate(trade.tradedAt)}</td>
                    <td>Completed</td>
                  </tr>
                ))}
                {detail.trades.length === 0 && (
                  <tr>
                    <td colSpan={5} className="muted">
                      No recent trades.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>

          <section className="liquidity-card">
            <h2 className="liquidity-section-title">Order Matching Preview</h2>
            {preview && preview.matches.length === 0 && (
              <p className="muted">
                No eligible buy/sell matches for this property.
              </p>
            )}
            {preview && preview.matches.length > 0 && (
              <table className="liquidity-table">
                <thead>
                  <tr>
                    <th>Buy Order</th>
                    <th>Sell Order</th>
                    <th>Shares</th>
                    <th>Price/Share</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.matches.map((match) => (
                    <tr key={`${match.buyOrderId}-${match.sellOrderId}`}>
                      <td>{match.buyOrderId.slice(0, 8)}…</td>
                      <td>{match.sellOrderId.slice(0, 8)}…</td>
                      <td>{match.shares}</td>
                      <td>${match.pricePerShare.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <div className="liquidity-actions">
              <button
                className="import-secondary"
                onClick={handleMatch}
                disabled={running}
              >
                Match Orders
              </button>
            </div>
          </section>
        </>
      )}
    </main>
  );
}
