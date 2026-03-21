import { FormEvent, useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
import { ActivityList } from "../components/dashboard/ActivityList";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorState } from "../components/ui/ErrorState";
import { LoadingState } from "../components/ui/LoadingState";
import { PageHero } from "../components/ui/PageHero";
import { FutureBadge } from "../components/ui/FutureBadge";
import { SectionHeader } from "../components/ui/SectionHeader";
import { StatusBadge } from "../components/ui/StatusBadge";
import type { ApiResponse, PaginatedResponse } from "../shared/api-types";
import { formatCurrency, formatDate } from "../shared/format";

type Order = {
  id: string;
  side: "BUY" | "SELL";
  status: string;
  workflowStatus: "pending" | "completed" | "cancelled";
  createdAt: string;
  property: { id: string; name: string; address1?: string; city: string; state: string };
  sharesRequested?: number;
  sharesForSale?: number;
  filledShares?: number;
  remainingShares?: number;
  askPricePerShare?: number;
  maxPricePerShare?: number | null;
  workflow?: {
    executionMode: "OPEN_ORDER" | "MATCHED_ORDER" | "PRIMARY_ISSUANCE";
    transactionCreated: boolean;
    transactionId?: string | null;
  };
};

type PropertyOption = {
  id: string;
  address1: string;
  city: string;
  state: string;
  listing: { askingPrice: number } | null;
  shareClass: { referencePricePerShare: number } | null;
};

export default function OrdersPage() {
  const [buyOrders, setBuyOrders] = useState<Order[]>([]);
  const [sellOrders, setSellOrders] = useState<Order[]>([]);
  const [properties, setProperties] = useState<PropertyOption[]>([]);
  const [side, setSide] = useState<"BUY" | "SELL">("BUY");
  const [propertyId, setPropertyId] = useState("");
  const [shares, setShares] = useState("10");
  const [orderType, setOrderType] = useState<"MARKET" | "LIMIT">("MARKET");
  const [pricePerShare, setPricePerShare] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadOrders() {
    const [buy, sell] = await Promise.all([
      apiFetch<PaginatedResponse<Order>>("/v1/orders?side=BUY&page=1&pageSize=12"),
      apiFetch<PaginatedResponse<Order>>("/v1/orders?side=SELL&page=1&pageSize=12"),
    ]);
    setBuyOrders(buy.data);
    setSellOrders(sell.data);
  }

  useEffect(() => {
    Promise.all([
      loadOrders(),
      apiFetch<PaginatedResponse<PropertyOption>>("/v1/properties?page=1&pageSize=50"),
    ])
      .then(([, propertyResponse]) => {
        setProperties(propertyResponse.data);
        if (!propertyId && propertyResponse.data[0]) {
          setPropertyId(propertyResponse.data[0].id);
          setPricePerShare(
            String(
              propertyResponse.data[0].shareClass?.referencePricePerShare ??
                propertyResponse.data[0].listing?.askingPrice ??
                ""
            )
          );
        }
      })
      .catch((fetchError: any) =>
        setError(fetchError?.message || "Order workspace could not be loaded.")
      )
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const selectedProperty = properties.find((property) => property.id === propertyId);
    if (!selectedProperty) return;

    if (side === "BUY") {
      setPricePerShare(
        String(
          selectedProperty.shareClass?.referencePricePerShare ??
            selectedProperty.listing?.askingPrice ??
            ""
        )
      );
      return;
    }

    setPricePerShare(
      String(
        selectedProperty.listing?.askingPrice ??
          selectedProperty.shareClass?.referencePricePerShare ??
          ""
      )
    );
  }, [propertyId, properties, side]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);
    setError(null);

    try {
      const quantity = Number(shares);
      const perShare = Number(pricePerShare);
      if (!propertyId) {
        throw new Error("Select a property before submitting an order.");
      }
      if (!Number.isInteger(quantity) || quantity <= 0) {
        throw new Error("Shares must be a positive whole number.");
      }
      if (side === "SELL" && (!(perShare > 0))) {
        throw new Error("Sell orders require a valid ask price.");
      }
      if (side === "BUY" && orderType === "LIMIT" && !(perShare > 0)) {
        throw new Error("Limit buy orders require a maximum price per share.");
      }

      const payload =
        side === "BUY"
          ? {
              side,
              propertyId,
              sharesRequested: quantity,
              orderType,
              maxPricePerShare: orderType === "LIMIT" ? perShare : undefined,
            }
          : {
              side,
              propertyId,
              sharesForSale: quantity,
              askPricePerShare: perShare,
              strategy: "BALANCED",
            };

      const response = await apiFetch<ApiResponse<Order>>("/v1/orders", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      const execution = response.data.workflow;
      if (execution?.transactionCreated) {
        setMessage(
          `${side} order submitted and completed via ${execution.executionMode.toLowerCase().replaceAll("_", " ")}.`
        );
      } else {
        setMessage(`${side} order submitted and is now pending.`);
      }

      setShares("10");
      await loadOrders();
      window.dispatchEvent(new Event("auth-changed"));
    } catch (submitError: any) {
      setError(submitError.message || "Order submission failed.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCancel(sideToCancel: "BUY" | "SELL", orderId: string) {
    setMessage(null);
    setError(null);
    try {
      await apiFetch<ApiResponse<{ status: string }>>(
        `/v1/orders/${sideToCancel}/${orderId}/cancel`,
        { method: "POST" }
      );
      setMessage(`${sideToCancel} order cancelled.`);
      await loadOrders();
      window.dispatchEvent(new Event("auth-changed"));
    } catch (cancelError: any) {
      setError(cancelError.message || "Unable to cancel order.");
    }
  }

  if (loading && buyOrders.length === 0 && sellOrders.length === 0) {
    return (
      <main className="screen-page">
        <PageHero
          eyebrow="Orders"
          title="Market intents and internal execution"
          description="Submit demo-friendly buy or sell orders. When internal inventory or a counterparty exists, Brickly deterministically completes the trade and updates holdings."
          actions={<FutureBadge label="Verified Ownership" phase="PHASE_3_BLOCKCHAIN" />}
        />
        <LoadingState
          title="Loading order workspace"
          description="Preparing properties, open orders, and form defaults."
        />
      </main>
    );
  }

  if (!loading && error && buyOrders.length === 0 && sellOrders.length === 0 && properties.length === 0) {
    return (
      <main className="screen-page">
        <PageHero
          eyebrow="Orders"
          title="Market intents and internal execution"
          description="Submit demo-friendly buy or sell orders. When internal inventory or a counterparty exists, Brickly deterministically completes the trade and updates holdings."
          actions={<FutureBadge label="Verified Ownership" phase="PHASE_3_BLOCKCHAIN" />}
        />
        <ErrorState title="Orders unavailable" message={error} />
      </main>
    );
  }

  return (
    <main className="screen-page">
      <PageHero
        eyebrow="Orders"
        title="Market intents and internal execution"
        description="Submit demo-friendly buy or sell orders. When internal inventory or a counterparty exists, Brickly deterministically completes the trade and updates holdings."
        actions={<FutureBadge label="Verified Ownership" phase="PHASE_3_BLOCKCHAIN" />}
      />

      <section className="dashboard-grid dashboard-main-grid">
        <div className="card dashboard-section">
          <SectionHeader
            eyebrow="Create Order"
            title="Simulate an internal trade"
            subtitle="Phase 1 uses internal deterministic order handling only. No payments, wallets, or blockchain settlement are involved yet."
            aside={<span className="badge subtle">{side} flow</span>}
          />

          <div className="tab-row">
            <button
              type="button"
              className={`tab ${side === "BUY" ? "active" : ""}`}
              onClick={() => setSide("BUY")}
            >
              Buy
            </button>
            <button
              type="button"
              className={`tab ${side === "SELL" ? "active" : ""}`}
              onClick={() => setSide("SELL")}
            >
              Sell
            </button>
          </div>

          <form className="grid order-form-grid" onSubmit={handleSubmit}>
            <div>
              <label className="label">Property</label>
              <select
                className="select"
                value={propertyId}
                onChange={(event) => setPropertyId(event.target.value)}
                disabled={properties.length === 0}
              >
                {properties.map((property) => (
                  <option key={property.id} value={property.id}>
                    {property.address1} · {property.city}, {property.state}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Shares</label>
              <input
                className="input"
                type="number"
                min="1"
                value={shares}
                onChange={(event) => setShares(event.target.value)}
              />
            </div>

            {side === "BUY" ? (
              <>
                <div>
                  <label className="label">Order Type</label>
                  <select
                    className="select"
                    value={orderType}
                    onChange={(event) => setOrderType(event.target.value as "MARKET" | "LIMIT")}
                  >
                    <option value="MARKET">Market</option>
                    <option value="LIMIT">Limit</option>
                  </select>
                </div>
                <div>
                  <label className="label">Max Price / Share</label>
                  <input
                    className="input"
                    type="number"
                    min="0"
                    step="0.01"
                    value={pricePerShare}
                    onChange={(event) => setPricePerShare(event.target.value)}
                    disabled={orderType === "MARKET"}
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="label">Ask Price / Share</label>
                  <input
                    className="input"
                    type="number"
                    min="0"
                    step="0.01"
                    value={pricePerShare}
                    onChange={(event) => setPricePerShare(event.target.value)}
                  />
                </div>
                <div className="order-note-card">
                  <strong>Workflow note</strong>
                  <p className="muted">
                    If a compatible open buy order exists, the sell order completes immediately.
                    Otherwise it remains pending and can be cancelled.
                  </p>
                </div>
              </>
            )}

            <div className="order-form-actions">
              <button className="button" type="submit" disabled={submitting || !propertyId}>
                {submitting ? "Submitting..." : `Submit ${side} Order`}
              </button>
            </div>
          </form>

          {message ? <p className="status-success">{message}</p> : null}
          {error ? <p className="status-error">{error}</p> : null}

          {/* PHASE_3_BLOCKCHAIN: internal execution and holdings adjustments below should later be augmented or replaced by verifiable transfer settlement and ownership attestations. */}
        </div>

        <aside className="card dashboard-section">
          <SectionHeader
            eyebrow="Order Lifecycle"
            title="Phase 1 behavior"
            subtitle="Orders can remain pending, complete immediately when internally matchable, or be cancelled by the submitting user."
          />
          <div className="dashboard-list">
            <div className="dashboard-list-row">
              <div>
                <strong>Pending</strong>
                <p className="muted">No eligible inventory or counterparty was found yet.</p>
              </div>
              <span className="badge subtle">OPEN / PARTIAL</span>
            </div>
            <div className="dashboard-list-row">
              <div>
                <strong>Completed</strong>
                <p className="muted">A trade was created, holdings updated, and notifications issued.</p>
              </div>
              <span className="badge subtle">FILLED</span>
            </div>
            <div className="dashboard-list-row">
              <div>
                <strong>Cancelled</strong>
                <p className="muted">The user or admin explicitly closed the order.</p>
              </div>
              <span className="badge subtle">CANCELLED</span>
            </div>
          </div>
        </aside>
      </section>

      <section className="dashboard-grid dashboard-halves-grid">
        <div className="card dashboard-section">
          <SectionHeader
            eyebrow="Demand"
            title="Buy orders"
            subtitle="Investor demand currently active across listed properties."
            aside={<span className="badge subtle">{buyOrders.length} records</span>}
          />
          <ActivityList
            items={buyOrders}
            emptyTitle="No buy orders"
            emptyDescription="New investor demand will appear here."
            renderItem={(order) => (
              <div key={order.id} className="dashboard-list-row">
                <div>
                  <strong>{order.property.name}</strong>
                  <p className="muted">
                    {order.property.city}, {order.property.state} · {order.workflowStatus}
                  </p>
                </div>
                <div className="dashboard-list-right">
                  <strong>
                    {order.filledShares ?? 0}/{order.sharesRequested ?? 0} shares
                  </strong>
                  <span className="muted">
                    {order.maxPricePerShare ? `Limit ${formatCurrency(order.maxPricePerShare)}` : "Market"} ·{" "}
                    {formatDate(order.createdAt)}
                  </span>
                  <StatusBadge value={order.status} />
                  {order.workflowStatus === "pending" ? (
                    <button
                      type="button"
                      className="button secondary small-button"
                      onClick={() => handleCancel("BUY", order.id)}
                    >
                      Cancel
                    </button>
                  ) : null}
                </div>
              </div>
            )}
          />
        </div>

        <div className="card dashboard-section">
          <SectionHeader
            eyebrow="Supply"
            title="Sell orders"
            subtitle="Available secondary liquidity and current sell-side activity."
            aside={<span className="badge subtle">{sellOrders.length} records</span>}
          />
          <ActivityList
            items={sellOrders}
            emptyTitle="No sell orders"
            emptyDescription="Secondary market supply will appear here."
            renderItem={(order) => (
              <div key={order.id} className="dashboard-list-row">
                <div>
                  <strong>{order.property.name}</strong>
                  <p className="muted">
                    {order.property.city}, {order.property.state} · {order.workflowStatus}
                  </p>
                </div>
                <div className="dashboard-list-right">
                  <strong>
                    {order.remainingShares ?? 0}/{order.sharesForSale ?? 0} shares
                  </strong>
                  <span className="muted">
                    Ask {formatCurrency(order.askPricePerShare ?? null)} · {formatDate(order.createdAt)}
                  </span>
                  <StatusBadge value={order.status} />
                  {order.workflowStatus === "pending" ? (
                    <button
                      type="button"
                      className="button secondary small-button"
                      onClick={() => handleCancel("SELL", order.id)}
                    >
                      Cancel
                    </button>
                  ) : null}
                </div>
              </div>
            )}
          />
        </div>
      </section>

      {properties.length === 0 ? (
        <EmptyState
          title="No properties available for orders"
          description="Add or seed property inventory before creating demo orders."
        />
      ) : null}
    </main>
  );
}
