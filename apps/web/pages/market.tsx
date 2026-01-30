import { FormEvent, useEffect, useState } from "react";
import { apiFetch, getTokenPayload } from "../lib/api";

type SellOrder = {
  id: string;
  sharesForSale: number;
  askPricePerShare: string;
  property: {
    id: string;
    address1: string;
    city: string;
    state: string;
  };
  user: {
    id: string;
    email: string | null;
    phone: string | null;
    role: string;
  };
};

export default function MarketPage() {
  const [orders, setOrders] = useState<SellOrder[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [loading, setLoading] = useState(true);
  const role = getTokenPayload()?.role;

  function loadOrders() {
    setLoading(true);
    return apiFetch<SellOrder[]>("/market/sell-orders")
      .then(setOrders)
      .catch((err) => setMessage(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadOrders();
  }, []);

  async function handleBuy(
    event: FormEvent,
    sellOrderId: string,
    sharesToBuy: number
  ) {
    event.preventDefault();
    setMessage(null);
    setStatus("idle");
    try {
      await apiFetch("/market/buy", {
        method: "POST",
        body: JSON.stringify({ sellOrderId, sharesToBuy }),
      });
      setMessage("Order filled.");
      setStatus("success");
      await loadOrders();
    } catch (error: any) {
      setMessage(error.message || "Failed to buy shares.");
      setStatus("error");
    }
  }

  return (
    <main className="import-page">
      <section className="import-header">
        <h1>Market</h1>
        <p>Browse available sell orders and buy shares.</p>
      </section>
      {loading && <p>Loading sell orders...</p>}
      {message && (
        <p className={status === "error" ? "status-error" : "status-success"}>
          {message}
        </p>
      )}
      <div className="import-card">
        <table className="import-table">
          <thead>
            <tr>
              <th>Property</th>
              <th>Shares</th>
              <th>Ask Price</th>
              <th className="action-cell">Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <SellOrderRow
                key={order.id}
                order={order}
                onBuy={handleBuy}
                canBuy={role !== "TENANT"}
              />
            ))}
            {orders.length === 0 && !loading && (
              <tr>
                <td colSpan={4} className="muted">
                  No sell orders available.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}

function SellOrderRow({
  order,
  onBuy,
  canBuy,
}: {
  order: SellOrder;
  onBuy: (event: FormEvent, sellOrderId: string, sharesToBuy: number) => void;
  canBuy: boolean;
}) {
  const [sharesToBuy, setSharesToBuy] = useState(0);

  return (
    <tr>
      <td>
        <div className="property-meta">
          <span className="address">{order.property.address1}</span>
          <span className="muted">
            {order.property.city}, {order.property.state}
          </span>
        </div>
      </td>
      <td>{order.sharesForSale}</td>
      <td>{order.askPricePerShare}</td>
      <td className="action-cell">
        {canBuy ? (
          <form
            onSubmit={(event) => onBuy(event, order.id, sharesToBuy)}
            className="import-actions"
          >
            <input
              className="input"
              type="number"
              min={1}
              value={sharesToBuy}
              onChange={(e) => setSharesToBuy(Number(e.target.value))}
              style={{ maxWidth: 120 }}
            />
            <button type="submit" className="import-primary">
              Buy
            </button>
          </form>
        ) : (
          <span className="muted">Tenants cannot buy shares.</span>
        )}
      </td>
    </tr>
  );
}
