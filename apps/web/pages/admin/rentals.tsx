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
    <main className="import-page">
      <section className="import-header">
        <h1>Rental Listings Admin</h1>
        <p>Mark listed properties as available for rent.</p>
      </section>
      {loading && <p>Loading properties...</p>}
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
              <th>Status</th>
              <th>Location</th>
              <th className="action-cell">Actions</th>
            </tr>
          </thead>
          <tbody>
            {properties.map((property) => (
              <tr key={property.id}>
                <td>
                  <div className="property-meta">
                    <span className="address">{property.address1}</span>
                    <span className="muted">
                      {property.city}, {property.state} {property.zip}
                    </span>
                  </div>
                </td>
                <td>
                  <span className="badge">{property.status}</span>
                </td>
                <td>
                  {property.city}, {property.state} {property.zip}
                </td>
                <td className="action-cell">
                  <div className="import-actions">
                    <button
                      className="import-primary"
                      onClick={() => handleRentList(property.id)}
                      disabled={property.status === "RENT_LISTED"}
                    >
                      Mark RENT_LISTED
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {properties.length === 0 && !loading && (
              <tr>
                <td colSpan={4} className="muted">
                  No properties available.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
