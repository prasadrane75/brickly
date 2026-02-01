import { FormEvent, useEffect, useState } from "react";
import { apiFetch } from "../lib/api";

type Holding = {
  id: string;
  sharesOwned: number;
  percent: number;
  property: {
    id: string;
    address1: string;
    city: string;
    state: string;
    zip: string;
  };
  shareClass: {
    id: string;
    totalShares: number;
    sharesAvailable: number;
  };
};

export default function PortfolioPage() {
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [loading, setLoading] = useState(true);

  function loadHoldings() {
    setLoading(true);
    return apiFetch<Holding[]>("/portfolio")
      .then(setHoldings)
      .catch((err) => setMessage(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadHoldings();
  }, []);

  async function handleSell(
    event: FormEvent,
    propertyId: string,
    sharesForSale: number,
    askPricePerShare: number
  ) {
    event.preventDefault();
    setMessage(null);
    setStatus("idle");
    try {
      await apiFetch("/market/sell-orders", {
        method: "POST",
        body: JSON.stringify({ propertyId, sharesForSale, askPricePerShare }),
      });
      setMessage("Sell order created.");
      setStatus("success");
      await loadHoldings();
    } catch (error: any) {
      setMessage(error.message || "Failed to create sell order.");
      setStatus("error");
    }
  }

  return (
    <main className="import-page">
      <section className="import-header">
        <h1>Portfolio</h1>
        <p>Track your holdings and create sell orders.</p>
      </section>
      {loading && <p>Loading portfolio...</p>}
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
              <th>Shares Owned</th>
              <th>Ownership</th>
              <th className="action-cell">Actions</th>
            </tr>
          </thead>
          <tbody>
            {holdings.map((holding) => (
              <HoldingRow
                key={holding.id}
                holding={holding}
                onSell={handleSell}
              />
            ))}
            {holdings.length === 0 && !loading && (
              <tr>
                <td colSpan={4} className="muted">
                  No holdings yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}

function HoldingRow({
  holding,
  onSell,
}: {
  holding: Holding;
  onSell: (
    event: FormEvent,
    propertyId: string,
    sharesForSale: number,
    askPricePerShare: number
  ) => void;
}) {
  const [sharesForSale, setSharesForSale] = useState(0);
  const [askPrice, setAskPrice] = useState(0);
  const [isSelling, setIsSelling] = useState(false);

  return (
    <>
      <tr>
        <td>
          <div className="property-meta">
            <span className="address">{holding.property.address1}</span>
            <span className="muted">
              {holding.property.city}, {holding.property.state} {holding.property.zip}
            </span>
          </div>
        </td>
        <td>{holding.sharesOwned}</td>
        <td>{(holding.percent * 100).toFixed(2)}%</td>
        <td className="action-cell">
          <div className="import-actions">
            <button
              className="import-primary"
              type="button"
              onClick={() => setIsSelling((prev) => !prev)}
            >
              {isSelling ? "Close" : "Sell"}
            </button>
          </div>
        </td>
      </tr>
      {isSelling && (
        <tr>
          <td colSpan={4}>
            <form
              onSubmit={(event) =>
                onSell(event, holding.property.id, sharesForSale, askPrice)
              }
              className="form"
            >
              <div>
                <label className="label">Shares to sell</label>
                <input
                  className="input"
                  type="number"
                  min={1}
                  value={sharesForSale}
                  onChange={(e) => setSharesForSale(Number(e.target.value))}
                />
              </div>
              <div>
                <label className="label">Ask price per share</label>
                <input
                  className="input"
                  type="number"
                  min={0}
                  value={askPrice}
                  onChange={(e) => setAskPrice(Number(e.target.value))}
                />
              </div>
              <div className="button-row">
                <button type="submit" className="import-primary">
                  Create Sell Order
                </button>
                <button
                  type="button"
                  className="import-secondary"
                  onClick={() => setIsSelling(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </td>
        </tr>
      )}
    </>
  );
}
