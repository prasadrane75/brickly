import { FormEvent, useEffect, useState } from "react";
import { getToken } from "../../lib/api";

type ListingRow = {
  externalId: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  listPrice: number;
  status: string;
  sourceType: string;
  thumbUrl: string;
};

type SourceType = "PUBLIC" | "PARTNER";

export default function AdminMlsListingsPage() {
  const [source, setSource] = useState<SourceType>("PUBLIC");
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<ListingRow[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function loadListings(currentSource = source, currentQuery = query) {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    setMessage(null);
    try {
      const params = new URLSearchParams({ source: currentSource });
      if (currentQuery.trim()) params.set("q", currentQuery.trim());
      const res = await fetch(`/api/admin/mls-listings?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to load listings.");
      }
      const data = (await res.json()) as ListingRow[];
      setRows(data);
      if (data.length === 0) {
        setMessage("No listings found.");
      }
    } catch (error: any) {
      setMessage(error.message || "Failed to load listings.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadListings();
  }, [source]);

  async function handleSearch(event: FormEvent) {
    event.preventDefault();
    await loadListings(source, query);
  }

  async function handleReseed() {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/mls-listings/seed", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to seed listings.");
      }
      const data = await res.json();
      setMessage(`Seeded ${data.count} MLS listings.`);
      await loadListings();
    } catch (error: any) {
      setMessage(error.message || "Failed to seed listings.");
    } finally {
      setLoading(false);
    }
  }

  async function handleClear() {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/mls-listings/clear", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to clear listings.");
      }
      const data = await res.json();
      setMessage(`Cleared ${data.count} MLS listings.`);
      await loadListings();
    } catch (error: any) {
      setMessage(error.message || "Failed to clear listings.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="import-page">
      <section className="import-header">
        <h1>MLS Listings</h1>
        <p>View and re-seed MLS-linked demo listings.</p>
      </section>

      <form className="import-search-row import-card" onSubmit={handleSearch}>
        <select
          className="select"
          value={source}
          onChange={(event) => setSource(event.target.value as SourceType)}
        >
          <option value="PUBLIC">MLS-Linked (Public Data)</option>
          <option value="PARTNER">MLS-Compatible Import (Demo)</option>
        </select>
        <input
          className="input"
          placeholder="Search by address, city, or zip"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <button className="import-primary" type="submit" disabled={loading}>
          Search
        </button>
      </form>

      <div className="import-card">
        <div className="import-actions" style={{ marginBottom: 12 }}>
          <button
            className="import-secondary"
            type="button"
            onClick={handleReseed}
            disabled={loading}
          >
            Re-seed Listings
          </button>
          <button
            className="import-secondary"
            type="button"
            onClick={handleClear}
            disabled={loading}
          >
            Clear Listings
          </button>
        </div>
        {loading && <p className="muted">Loading listings...</p>}
        {message && <p className="muted">{message}</p>}
        <table className="import-table">
          <thead>
            <tr>
              <th>Property</th>
              <th>Source</th>
              <th>Status</th>
              <th>Location</th>
              <th className="action-cell">Price</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.externalId}>
                <td>
                  <div className="property-cell">
                    <img
                      className="property-thumb"
                      src={row.thumbUrl}
                      alt={row.address}
                    />
                    <div className="property-meta">
                      <span className="address">{row.address}</span>
                      <span className="muted">{row.externalId}</span>
                    </div>
                  </div>
                </td>
                <td>{row.sourceType}</td>
                <td>
                  <span className="badge">{row.status}</span>
                </td>
                <td>
                  {row.city}, {row.state} {row.zip}
                </td>
                <td className="action-cell">
                  ${row.listPrice.toLocaleString()}
                </td>
              </tr>
            ))}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={5} className="muted">
                  No listings found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
