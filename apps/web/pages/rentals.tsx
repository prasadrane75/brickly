import { FormEvent, useEffect, useState } from "react";
import { apiFetch, getTokenPayload } from "../lib/api";

type Property = {
  id: string;
  address1: string;
  city: string;
  state: string;
  zip: string;
  status: string;
  images: Array<{ url: string }>;
};

export default function RentalsPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [loading, setLoading] = useState(true);
  const role = getTokenPayload()?.role;

  useEffect(() => {
    apiFetch<Property[]>("/rentals")
      .then(setProperties)
      .catch((err) => {
        setMessage(err.message || "Failed to load rentals.");
        setStatus("error");
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleApply(event: FormEvent, propertyId: string) {
    event.preventDefault();
    setMessage(null);
    setStatus("idle");
    try {
      await apiFetch("/rentals/apply", {
        method: "POST",
        body: JSON.stringify({ propertyId }),
      });
      setMessage("Application submitted.");
      setStatus("success");
    } catch (error: any) {
      setMessage(error.message || "Failed to apply.");
      setStatus("error");
    }
  }

  return (
    <main>
      <h1 className="section-title">Rentals</h1>
      {loading && <p>Loading rentals...</p>}
      {message && (
        <p className={status === "error" ? "status-error" : "status-success"}>
          {message}
        </p>
      )}
      {properties.map((property) => (
        <section key={property.id} className="card">
          <h3>
            {property.address1}, {property.city}
          </h3>
          <p className="muted">
            {property.city}, {property.state} {property.zip}
          </p>
          <div className="image-strip">
            {property.images.map((img) => (
              <img
                key={img.url}
                src={img.url}
                alt="Property"
              />
            ))}
          </div>
          {role === "TENANT" ? (
            <form onSubmit={(event) => handleApply(event, property.id)}>
              <button type="submit" className="button" style={{ marginTop: 12 }}>
                Apply to Rent
              </button>
            </form>
          ) : (
            <p className="muted" style={{ marginTop: 12 }}>
              Log in as a tenant to apply.
            </p>
          )}
        </section>
      ))}
    </main>
  );
}
