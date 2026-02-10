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
  buyer: {
    id: string;
    email?: string | null;
    role: string;
  };
};

type BuyOrderInput = {
  propertyId: string;
  orderType: "MARKET" | "LIMIT";
  sharesRequested: number;
  maxPricePerShare?: number;
};

export default function BuyOrdersPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [orders, setOrders] = useState<BuyOrder[]>([]);
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
      apiFetch<{ propertyId: string }[]>("/market/sell-orders"),
    ])
      .then(([propertyData, orderData, sellOrders]) => {
        const availableIds = new Set(
          sellOrders.map((order) => order.propertyId)
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
        setOrders(orderData);
      })
      .catch((error) => setMessage(error.message || "Failed to load buy orders."));
  }, []);

  async function refreshOrders() {
    const orderData = await apiFetch<BuyOrder[]>("/market/buy-orders");
    setOrders(orderData);
  }

  async function submitOrder(event: React.FormEvent) {
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
      await refreshOrders();
      setMessage("Buy order created.");
    } catch (error: any) {
      setMessage(error.message || "Failed to create buy order.");
    } finally {
      setLoading(false);
    }
  }

  async function cancelOrder(id: string) {
    try {
      await apiFetch(`/market/buy-orders/${id}/cancel`, { method: "POST" });
      await refreshOrders();
    } catch (error: any) {
      setMessage(error.message || "Failed to cancel order.");
    }
  }

  return (
    <main>
      <h1 className="section-title">Buy Orders</h1>
      <div className="grid">
        <div className="card">
          <h2 className="section-title">Create Buy Order</h2>
          <form className="form" onSubmit={submitOrder}>
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
          {message && <p className="status-success">{message}</p>}
          {orders.length === 0 ? (
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
                {orders.map((order) => (
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
                          onClick={() => cancelOrder(order.id)}
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
    </main>
  );
}
