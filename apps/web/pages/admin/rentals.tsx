import { useEffect, useState } from "react";
import { apiFetch } from "../../lib/api";

type Property = {
  id: string;
  address1: string;
  city: string;
  state: string;
  zip: string;
  status: string;
};

export default function AdminRentalsPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [loading, setLoading] = useState(true);

  function loadProperties() {
    setLoading(true);
    return apiFetch<Property[]>("/properties")
      .then(setProperties)
      .catch((err) => {
        setMessage(err.message || "Failed to load properties.");
        setStatus("error");
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadProperties();
  }, []);

  async function handleRentList(propertyId: string) {
    setMessage(null);
    setStatus("idle");
    try {
      await apiFetch("/admin/rent-list", {
        method: "POST",
        body: JSON.stringify({ propertyId }),
      });
      setMessage("Property marked as RENT_LISTED.");
      setStatus("success");
      await loadProperties();
    } catch (error: any) {
      setMessage(error.message || "Failed to update property.");
      setStatus("error");
    }
  }

  return (
    <main>
      <h1 className="section-title">Rental Listings Admin</h1>
      {loading && <p>Loading properties...</p>}
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
          <p>
            {property.city}, {property.state} {property.zip}
          </p>
          <p>Status: {property.status}</p>
          <button
            className="button"
            onClick={() => handleRentList(property.id)}
            disabled={property.status === "RENT_LISTED"}
          >
            Mark as RENT_LISTED
          </button>
        </section>
      ))}
    </main>
  );
}
