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
    <main>
      <h1 className="section-title">Market</h1>
      {loading && <p>Loading sell orders...</p>}
      {message && (
        <p className={status === "error" ? "status-error" : "status-success"}>
          {message}
        </p>
      )}
      {orders.map((order) => (
        <SellOrderCard
          key={order.id}
          order={order}
          onBuy={handleBuy}
          canBuy={role !== "TENANT"}
        />
      ))}
    </main>
  );
}

function SellOrderCard({
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
    <section className="card">
      <h3>
        {order.property.address1}, {order.property.city}
      </h3>
      <p>Shares for sale: {order.sharesForSale}</p>
      <p>Ask price: {order.askPricePerShare}</p>
      {canBuy ? (
        <form onSubmit={(event) => onBuy(event, order.id, sharesToBuy)} className="form">
          <input
            className="input"
            type="number"
            min={1}
            value={sharesToBuy}
            onChange={(e) => setSharesToBuy(Number(e.target.value))}
          />
          <button type="submit" className="button">
            Buy
          </button>
        </form>
      ) : (
        <p className="muted">Tenants cannot buy shares.</p>
      )}
    </section>
  );
}
