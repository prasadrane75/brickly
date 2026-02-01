import { useRouter } from "next/router";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { apiFetch, getTokenPayload } from "../../lib/api";

type Property = {
  id: string;
  address1: string;
  city: string;
  state: string;
  zip: string;
  status: string;
  listings: Array<{
    askingPrice: string;
    bonusPercent: string;
    lister?: { email: string | null; phone: string | null };
  }>;
  images: Array<{ url: string }>;
  shareClass?: { totalShares: number; sharesAvailable: number } | null;
};

export default function PropertyDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const [property, setProperty] = useState<Property | null>(null);
  const [sharesToBuy, setSharesToBuy] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [loading, setLoading] = useState(true);
  const role = getTokenPayload()?.role;

  function loadProperty(propertyId: string) {
    setLoading(true);
    return apiFetch<Property>(`/properties/${propertyId}`)
      .then(setProperty)
      .catch((err) => setMessage(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (!id || Array.isArray(id)) return;
    loadProperty(id);
  }, [id]);

  const percent = useMemo(() => {
    if (!property?.shareClass || sharesToBuy <= 0) return 0;
    return sharesToBuy / property.shareClass.totalShares;
  }, [property, sharesToBuy]);

  async function handleBuy(event: FormEvent) {
    event.preventDefault();
    if (!property) return;
    setMessage(null);
    setStatus("idle");
    try {
      await apiFetch("/invest/buy", {
        method: "POST",
        body: JSON.stringify({
          propertyId: property.id,
          sharesToBuy,
        }),
      });
      setMessage("Purchase successful.");
      setStatus("success");
      await loadProperty(property.id);
    } catch (error: any) {
      setMessage(error.message || "Purchase failed.");
      setStatus("error");
    }
  }

  if (loading) {
    return <p>Loading property...</p>;
  }

  if (!property) {
    return <p>Property not found.</p>;
  }

  return (
    <main>
      <h1 className="section-title">
        {property.address1}, {property.city}
      </h1>
      <p className="muted">
        {property.city}, {property.state} {property.zip}
      </p>
      {property.listings[0]?.lister && (
        <p className="muted">
          Lister:{" "}
          {property.listings[0].lister.email ||
            property.listings[0].lister.phone ||
            "Unknown"}
        </p>
      )}
      <section className="image-strip">
        {property.images.map((img) => (
          <img key={img.url} src={img.url} alt="Property" />
        ))}
      </section>

      <section className="card" style={{ marginTop: 24 }}>
        <h3>Buy Shares</h3>
        {property.shareClass && (
          <p>
            Available: {property.shareClass.sharesAvailable} /{" "}
            {property.shareClass.totalShares}
          </p>
        )}
        {role !== "TENANT" ? (
          <form onSubmit={handleBuy} className="form">
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
          <p className="muted">Tenants cannot buy fractional shares.</p>
        )}
        <p>Percent of property: {(percent * 100).toFixed(2)}%</p>
        {message && (
          <p className={status === "error" ? "status-error" : "status-success"}>
            {message}
          </p>
        )}
      </section>
    </main>
  );
}
