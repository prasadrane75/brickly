import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../lib/api";

type Property = {
  id: string;
  address1: string;
  city: string;
  state: string;
};

type BuyOrder = {
  id: string;
  orderType: "MARKET" | "LIMIT";
  sharesRequested: number;
  filledShares: number;
  maxPricePerShare?: number | null;
  status: "OPEN" | "PARTIAL" | "FILLED" | "CANCELLED";
  createdAt: string;
  property: Property;
};

type SellOrder = {
  id: string;
  propertyId: string;
  sharesForSale: number;
  remainingShares: number;
  askPricePerShare: number;
  optimizedPricePerShare?: number | null;
  status: "OPEN" | "PARTIAL" | "FILLED" | "CANCELLED";
  createdAt: string;
  property: Property;
};

type BuyOrderInput = {
  propertyId: string;
  orderType: "MARKET" | "LIMIT";
  sharesRequested: number;
  maxPricePerShare?: number;
};

export default function MarketOrdersPage() {
  const [activeTab, setActiveTab] = useState<"BUY" | "SELL">("BUY");
  const [properties, setProperties] = useState<Property[]>([]);
  const [buyOrders, setBuyOrders] = useState<BuyOrder[]>([]);
  const [sellOrders, setSellOrders] = useState<SellOrder[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<BuyOrderInput>({
    propertyId: "",
    orderType: "LIMIT",
    sharesRequested: 100,
    maxPricePerShare: 180,
  });

  const selectedProperty = useMemo(
    () => properties.find((p) => p.id === form.propertyId),
    [properties, form.propertyId]
  );

  useEffect(() => {
    Promise.all([
      apiFetch<Property[]>("/properties"),
      apiFetch<BuyOrder[]>("/market/buy-orders"),
      apiFetch<SellOrder[]>("/market/sell-orders"),
    ])
      .then(([propertyData, buyData, sellData]) => {
        const availableIds = new Set(
          sellData.map((order) => order.propertyId)
        );
        const availableProperties = propertyData.filter((property) =>
          availableIds.has(property.id)
        );
        setProperties(availableProperties);
        if (availableProperties.length > 0) {
          const params = new URLSearchParams(window.location.search);
          const paramPropertyId = params.get("propertyId");
          const selectedId =
            paramPropertyId &&
            availableProperties.some((property) => property.id === paramPropertyId)
              ? paramPropertyId
              : availableProperties[0]?.id ?? "";
          if (!form.propertyId || paramPropertyId) {
            setForm((prev) => ({ ...prev, propertyId: selectedId }));
          }
        }
        setBuyOrders(buyData);
        setSellOrders(
          sellData.map((order) => ({
            ...order,
            propertyId: order.property?.id ?? order.propertyId,
            askPricePerShare: Number(order.askPricePerShare),
            optimizedPricePerShare: order.optimizedPricePerShare
              ? Number(order.optimizedPricePerShare)
              : null,
          }))
        );
      })
      .catch((error) =>
        setMessage(error.message || "Failed to load market orders.")
      );
  }, []);

  async function refreshBuyOrders() {
    const data = await apiFetch<BuyOrder[]>("/market/buy-orders");
    setBuyOrders(data);
  }

  async function submitBuyOrder(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const payload: BuyOrderInput = {
        propertyId: form.propertyId,
        orderType: form.orderType,
        sharesRequested: Number(form.sharesRequested),
      };
      if (form.orderType === "LIMIT") {
        payload.maxPricePerShare = Number(form.maxPricePerShare || 0);
      }

      await apiFetch("/market/buy-orders", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      await refreshBuyOrders();
      setActiveTab("BUY");
      setMessage("Buy order created.");
    } catch (error: any) {
      setMessage(error.message || "Failed to create buy order.");
    } finally {
      setLoading(false);
    }
  }

  async function cancelBuyOrder(id: string) {
    try {
      await apiFetch(`/market/buy-orders/${id}/cancel`, { method: "POST" });
      await refreshBuyOrders();
    } catch (error: any) {
      setMessage(error.message || "Failed to cancel order.");
    }
  }

  function prefillFromSell(order: SellOrder) {
    setForm((prev) => ({
      ...prev,
      propertyId: order.propertyId,
      orderType: "LIMIT",
      sharesRequested: order.remainingShares,
      maxPricePerShare: order.askPricePerShare,
    }));
    setActiveTab("BUY");
  }

  return (
    <main>
      <h1 className="section-title">Market Orders</h1>
      <div className="tab-row">
        <button
          className={activeTab === "BUY" ? "tab active" : "tab"}
          onClick={() => setActiveTab("BUY")}
        >
          Buy Orders
        </button>
        <button
          className={activeTab === "SELL" ? "tab active" : "tab"}
          onClick={() => setActiveTab("SELL")}
        >
          Sell Orders
        </button>
      </div>

      {message && <p className="status-success">{message}</p>}

      {activeTab === "BUY" ? (
        <div className="grid">
          <div className="card">
            <h2 className="section-title">Create Buy Order</h2>
            <form className="form" onSubmit={submitBuyOrder}>
              <label className="label">
                Property
                <select
                  className="select"
                  value={form.propertyId}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      propertyId: event.target.value,
                    }))
                  }
                >
                  {properties.map((property) => (
                    <option key={property.id} value={property.id}>
                      {property.address1}, {property.city}
                    </option>
                  ))}
                </select>
              </label>
              {selectedProperty && (
                <p className="muted">
                  {selectedProperty.address1}, {selectedProperty.city},{" "}
                  {selectedProperty.state}
                </p>
              )}
              <label className="label">
                Order Type
                <select
                  className="select"
                  value={form.orderType}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      orderType: event.target.value as BuyOrderInput["orderType"],
                    }))
                  }
                >
                  <option value="MARKET">Market</option>
                  <option value="LIMIT">Limit</option>
                </select>
              </label>
              <label className="label">
                Shares Requested
                <input
                  className="input"
                  type="number"
                  min={1}
                  value={form.sharesRequested}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      sharesRequested: Number(event.target.value),
                    }))
                  }
                />
              </label>
              {form.orderType === "LIMIT" && (
                <label className="label">
                  Max Price Per Share
                  <input
                    className="input"
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.maxPricePerShare ?? ""}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        maxPricePerShare: Number(event.target.value),
                      }))
                    }
                  />
                </label>
              )}
              <button className="button" type="submit" disabled={loading}>
                {loading ? "Saving..." : "Create Order"}
              </button>
            </form>
          </div>

          <div className="card">
            <h2 className="section-title">Recent Buy Orders</h2>
            {buyOrders.length === 0 ? (
              <p className="muted">No buy orders yet.</p>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Property</th>
                    <th>Type</th>
                    <th>Shares</th>
                    <th>Max Price</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {buyOrders.map((order) => (
                    <tr key={order.id}>
                      <td>
                        {order.property.address1}, {order.property.city}
                      </td>
                      <td>{order.orderType}</td>
                      <td>
                        {order.filledShares}/{order.sharesRequested}
                      </td>
                      <td>
                        {order.maxPricePerShare
                          ? `$${order.maxPricePerShare}`
                          : "—"}
                      </td>
                      <td>{order.status}</td>
                      <td>
                        {(order.status === "OPEN" ||
                          order.status === "PARTIAL") && (
                          <button
                            className="import-secondary"
                            onClick={() => cancelBuyOrder(order.id)}
                          >
                            Cancel
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      ) : (
        <div className="card">
          <h2 className="section-title">Open Sell Orders</h2>
          {sellOrders.length === 0 ? (
            <p className="muted">No sell orders available.</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Property</th>
                  <th>Available Shares</th>
                  <th>Ask Price</th>
                  <th>Optimized Price</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {sellOrders.map((order) => (
                  <tr key={order.id}>
                    <td>
                      {order.property.address1}, {order.property.city}
                    </td>
                    <td>{order.remainingShares}</td>
                    <td>${order.askPricePerShare}</td>
                    <td>
                      {order.optimizedPricePerShare
                        ? `$${order.optimizedPricePerShare}`
                        : "—"}
                    </td>
                    <td>{order.status}</td>
                    <td>
                      <button
                        className="import-secondary"
                        onClick={() => prefillFromSell(order)}
                      >
                        Buy This
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </main>
  );
}
