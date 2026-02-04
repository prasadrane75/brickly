import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { getToken } from "../../../lib/api";

type ImportResult = {
  externalId: string;
  addressLine: string;
  city: string;
  state: string;
  zip: string;
  listPrice: number;
  beds: number;
  baths: number;
  thumbUrl: string;
  status: string;
};

type SourceType = "PUBLIC" | "PARTNER" | "MLS";

export default function ImportListingsPage() {
  const router = useRouter();
  const [source, setSource] = useState<SourceType>("PUBLIC");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ImportResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [kycApproved, setKycApproved] = useState<boolean | null>(null);

  const qParam = useMemo(() => {
    if (!router.isReady) return "";
    const raw = router.query.q;
    return typeof raw === "string" ? raw : "";
  }, [router.isReady, router.query.q]);

  useEffect(() => {
    if (!router.isReady) return;
    if (qParam) {
      setQuery(qParam);
      void runSearch(qParam, source);
    }
  }, [qParam, router.isReady, source]);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }
    async function loadKyc() {
      try {
        const res = await fetch("/api/kyc/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          setKycApproved(false);
          return;
        }
        const data = await res.json();
        setKycApproved(data.status === "APPROVED");
      } catch {
        setKycApproved(false);
      }
    }
    void loadKyc();
  }, [router]);

  async function runSearch(nextQuery: string, nextSource: SourceType) {
    setLoading(true);
    setMessage(null);
    try {
      const params = new URLSearchParams({ source: nextSource });
      if (nextQuery.trim()) {
        params.set("q", nextQuery.trim());
      }
      const res = await fetch(`/api/import/listings?${params.toString()}`);
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to load listings.");
      }
      const data = (await res.json()) as ImportResult[];
      setResults(data);
      if (data.length === 0) {
        setMessage("No listings found. Try another search.");
      }
    } catch (error: any) {
      setMessage(error.message || "Failed to load listings.");
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  function handleSearch(event: FormEvent) {
    event.preventDefault();
    void runSearch(query, source);
  }

  function handleImport(externalId: string) {
    if (kycApproved === false) return;
    router.push(`/lister/import/${externalId}?source=${source}`);
  }

  return (
    <div className="import-page">
      <section className="import-header">
        <div>
          <h1>Import Listings</h1>
          <p>Import listing details using public data sources or partner feeds.</p>
        </div>
        <div className="import-toolbar">
          <button className="import-pill" type="button">
            Lists
          </button>
          <button
            className="import-primary"
            type="button"
            onClick={() => router.push("/listings/new")}
          >
            List New Property
          </button>
        </div>
      </section>
      {kycApproved === false && (
        <p className="status-error">
          KYC approval required to import/create listings.
        </p>
      )}

      <form className="import-search-row import-card" onSubmit={handleSearch}>
        <select
          className="select"
          value={source}
          onChange={(event) => setSource(event.target.value as SourceType)}
        >
          <option value="PUBLIC">MLS-Linked (Public Data)</option>
          <option value="PARTNER">MLS-Compatible Import (Demo)</option>
          <option value="MLS" disabled>
            MLS (Coming soon)
          </option>
        </select>
        <div className="import-search">
          <span className="search-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
              <path
                d="M11 18a7 7 0 1 1 0-14 7 7 0 0 1 0 14Zm8 2-4.2-4.2"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </span>
          <input
            placeholder="Search by MLS ID, address or keyword"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <button
          className="import-primary"
          type="submit"
          disabled={kycApproved === false}
        >
          Search
        </button>
      </form>

      <div className="import-card">
        <h2 className="import-section-title">Import from Listing</h2>
        {loading && <p className="muted">Loading listings...</p>}
        {message && <p className="muted">{message}</p>}
        <div className="import-table">
          <table className="import-table">
            <thead>
              <tr>
                <th>Property</th>
                <th>MLS / Status</th>
                <th>Location</th>
                <th className="action-cell">Actions</th>
              </tr>
            </thead>
            <tbody>
              {results.map((row) => (
                <tr key={row.externalId}>
                  <td>
                    <div className="property-cell">
                      <img
                        className="property-thumb"
                        src={row.thumbUrl}
                        alt={row.addressLine}
                      />
                      <div className="property-meta">
                        <span className="address">{row.addressLine}</span>
                        <span className="muted">MLS {row.externalId}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="property-meta">
                      <span
                        className={`import-status-pill ${
                          row.status.toLowerCase() === "pending" ? "warn" : ""
                        }`}
                      >
                        {row.status}
                      </span>
                      <span className="muted">
                        {row.beds} bd · {row.baths} ba
                      </span>
                    </div>
                  </td>
                  <td>
                    {row.city}, {row.state} {row.zip}
                  </td>
                  <td className="action-cell">
                    <div className="import-actions">
                      <button
                        className="import-primary"
                        type="button"
                        onClick={() => handleImport(row.externalId)}
                        disabled={kycApproved === false}
                      >
                        Import Property
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && results.length === 0 && (
                <tr>
                  <td colSpan={4} className="muted">
                    No results yet. Search to see listings.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
