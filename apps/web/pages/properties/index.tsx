import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { apiFetch, getTokenPayload } from "../../lib/api";

type Property = {
  id: string;
  type: string;
  address1: string;
  city: string;
  state: string;
  zip: string;
  squareFeet?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  status: string;
  listings: Array<{
    askingPrice: string;
    bonusPercent: string;
    lister?: { email: string | null; phone: string | null };
  }>;
  images: Array<{ url: string }>;
  shareClass?: { totalShares: number; sharesAvailable: number } | null;
};

export default function PropertiesPage() {
  const router = useRouter();
  const [properties, setProperties] = useState<Property[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [importedMessage, setImportedMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string | null>(null);
  const [locationFilter, setLocationFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [sqftFilter, setSqftFilter] = useState("");
  const [bedFilter, setBedFilter] = useState("");
  const [bathFilter, setBathFilter] = useState("");

  const sqftOptions = Array.from({ length: 29 }, (_, i) => 500 + i * 250);
  const countOptions = Array.from({ length: 5 }, (_, i) => i + 1);

  useEffect(() => {
    setRole(getTokenPayload()?.role ?? null);
    apiFetch<Property[]>("/properties")
      .then((data) => setProperties(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!router.isReady) return;
    if (router.query.imported === "1") {
      setImportedMessage("Imported Successfully");
    }
  }, [router.isReady, router.query.imported]);

  async function handleDelete(propertyId: string) {
    const confirmed = window.confirm(
      "Delete this property? This cannot be undone."
    );
    if (!confirmed) return;
    try {
      await apiFetch(`/admin/properties/${propertyId}`, { method: "DELETE" });
      setProperties((prev) => prev.filter((p) => p.id !== propertyId));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Delete failed";
      setError(message);
    }
  }

  return (
    <main className="import-page">
      <section className="import-header">
        <h1>Properties</h1>
        <p>Browse available properties and track listing status.</p>
      </section>
      {importedMessage && (
        <p className="status-success">{importedMessage}</p>
      )}
      <div className="import-card grid">
        <div>
          <label className="label">Location filter</label>
          <input
            className="input"
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
            placeholder="City, state, zip, or address"
          />
        </div>
        <div>
          <label className="label">Property type</label>
          <select
            className="select"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="">All</option>
            <option value="HOUSE">House</option>
            <option value="TOWNHOME">Townhome</option>
            <option value="APARTMENT">Apartment</option>
            <option value="CONDO">Condo</option>
          </select>
        </div>
        <div>
          <label className="label">Square feet</label>
          <select
            className="select"
            value={sqftFilter}
            onChange={(e) => setSqftFilter(e.target.value)}
          >
            <option value="">All</option>
            {sqftOptions.map((sqft) => (
              <option key={sqft} value={String(sqft)}>
                {sqft.toLocaleString()}+
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Bedrooms</label>
          <select
            className="select"
            value={bedFilter}
            onChange={(e) => setBedFilter(e.target.value)}
          >
            <option value="">All</option>
            {countOptions.map((count) => (
              <option key={count} value={String(count)}>
                {count}+
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Bathrooms</label>
          <select
            className="select"
            value={bathFilter}
            onChange={(e) => setBathFilter(e.target.value)}
          >
            <option value="">All</option>
            {countOptions.map((count) => (
              <option key={count} value={String(count)}>
                {count}+
              </option>
            ))}
          </select>
        </div>
      </div>
      {loading && <p>Loading properties...</p>}
      {error && <p>{error}</p>}
      <div className="import-card">
        <table className="import-table">
          <thead>
            <tr>
              <th>Property</th>
              <th>Status</th>
              <th>Location</th>
              <th>Shares</th>
              <th className="action-cell">Actions</th>
            </tr>
          </thead>
          <tbody>
            {properties
              .filter((property) => {
                if (!locationFilter.trim()) return true;
                const term = locationFilter.toLowerCase();
                return (
                  property.address1.toLowerCase().includes(term) ||
                  property.city.toLowerCase().includes(term) ||
                  property.state.toLowerCase().includes(term) ||
                  property.zip.toLowerCase().includes(term)
                );
              })
              .filter((property) => {
                if (!typeFilter) return true;
                return property.type === typeFilter;
              })
              .filter((property) => {
                if (!sqftFilter) return true;
                const minSqft = Number(sqftFilter);
                return typeof property.squareFeet === "number"
                  ? property.squareFeet >= minSqft
                  : false;
              })
              .filter((property) => {
                if (!bedFilter) return true;
                const minBeds = Number(bedFilter);
                return typeof property.bedrooms === "number"
                  ? property.bedrooms >= minBeds
                  : false;
              })
              .filter((property) => {
                if (!bathFilter) return true;
                const minBaths = Number(bathFilter);
                return typeof property.bathrooms === "number"
                  ? property.bathrooms >= minBaths
                  : false;
              })
              .map((property) => (
                <tr key={property.id}>
                  <td>
                    <div className="property-cell">
                      {property.images[0]?.url ? (
                        <img
                          className="property-thumb"
                          src={property.images[0].url}
                          alt={property.address1}
                        />
                      ) : null}
                      <div className="property-meta">
                        <span className="address">
                          <Link href={`/properties/${property.id}`}>
                            {property.address1}
                          </Link>
                        </span>
                        <span className="muted">
                          {property.listings[0]?.lister?.email ||
                            property.listings[0]?.lister?.phone ||
                            "Lister unknown"}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="badge">{property.status}</span>
                  </td>
                  <td>
                    {property.city}, {property.state} {property.zip}
                  </td>
                  <td>
                    {property.shareClass
                      ? `${property.shareClass.sharesAvailable} / ${property.shareClass.totalShares}`
                      : "—"}
                  </td>
                  <td className="action-cell">
                    <div className="import-actions">
                      {role === "ADMIN" && property.status === "LISTED" && (
                        <button
                          className="import-secondary"
                          onClick={() => handleDelete(property.id)}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            {properties.length === 0 && (
              <tr>
                <td colSpan={5} className="muted">
                  No properties found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
