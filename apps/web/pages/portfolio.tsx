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
    <main>
      <h1 className="section-title">Portfolio</h1>
      {loading && <p>Loading portfolio...</p>}
      {message && (
        <p className={status === "error" ? "status-error" : "status-success"}>
          {message}
        </p>
      )}
      {holdings.map((holding) => (
        <HoldingCard key={holding.id} holding={holding} onSell={handleSell} />
      ))}
    </main>
  );
}

function HoldingCard({
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

  return (
    <section className="card">
      <h3>
        {holding.property.address1}, {holding.property.city}
      </h3>
      <p>
        Shares owned: {holding.sharesOwned} ({(holding.percent * 100).toFixed(2)}%)
      </p>
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
        <button type="submit" className="button">
          Create Sell Order
        </button>
      </form>
    </section>
  );
}
