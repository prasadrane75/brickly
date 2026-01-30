import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { getToken } from "../../lib/api";

type ImportRow = {
  id: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  thumbUrl: string;
  status: string;
  mlsId: string;
};

const mockResults: ImportRow[] = [
  {
    id: "row-1",
    address: "1254 Pinecrest Ave",
    city: "Seattle",
    state: "WA",
    zip: "98101",
    thumbUrl: "https://images.unsplash.com/photo-1568605114967-8130f3a36994",
    status: "Active",
    mlsId: "MLS-118204",
  },
  {
    id: "row-2",
    address: "77 Harbor Vista Dr",
    city: "San Diego",
    state: "CA",
    zip: "92101",
    thumbUrl: "https://images.unsplash.com/photo-1507089947368-19c1da9775ae",
    status: "Pending",
    mlsId: "MLS-762914",
  },
  {
    id: "row-3",
    address: "312 Maple Ridge Ln",
    city: "Portland",
    state: "OR",
    zip: "97205",
    thumbUrl: "https://images.unsplash.com/photo-1449844908441-8829872d2607",
    status: "Active",
    mlsId: "MLS-440812",
  },
  {
    id: "row-4",
    address: "46 Bayside Walk",
    city: "Tampa",
    state: "FL",
    zip: "33602",
    thumbUrl: "https://images.unsplash.com/photo-1484154218962-a197022b5858",
    status: "Active",
    mlsId: "MLS-229530",
  },
  {
    id: "row-5",
    address: "900 Sunrise Point",
    city: "Miami",
    state: "FL",
    zip: "33131",
    thumbUrl: "https://images.unsplash.com/photo-1494526585095-c41746248156",
    status: "Active",
    mlsId: "MLS-510347",
  },
];

export default function ListerPropertiesPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [kycApproved, setKycApproved] = useState<boolean | null>(null);

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

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return mockResults;
    return mockResults.filter((row) => {
      const haystack = `${row.address} ${row.city} ${row.zip} ${row.mlsId}`.toLowerCase();
      return haystack.includes(term);
    });
  }, [query]);

  function goToImport(nextQuery?: string) {
    if (kycApproved === false) return;
    const q = (nextQuery ?? query).trim();
    if (q) {
      router.push(`/lister/import?q=${encodeURIComponent(q)}`);
      return;
    }
    router.push("/lister/import");
  }

  function handleSearch(event: FormEvent) {
    event.preventDefault();
    goToImport();
  }

  return (
    <div className="import-page">
      <section className="import-header">
        <h1>Your Properties</h1>
        <p>Manage your listings and import new properties faster.</p>
      </section>
      {kycApproved === false && (
        <p className="status-error">
          KYC approval required to import/create listings.
        </p>
      )}

      <section className="import-card">
        <div>
          <h2 className="import-section-title">
            List a property faster by importing from MLS or public listing
            services.
          </h2>
        </div>
        <div className="import-actions">
          <button
            className="import-primary"
            onClick={() => goToImport()}
            disabled={kycApproved === false}
          >
            Import from Listing
          </button>
        </div>
      </section>

      <form className="import-search-row import-card" onSubmit={handleSearch}>
        <input
          className="input"
          placeholder="Search by MLS ID, address or keyword"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
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
            {filtered.map((row) => (
              <tr key={row.id}>
                <td>
                  <div className="property-cell">
                    <img
                      className="property-thumb"
                      src={row.thumbUrl}
                      alt={row.address}
                    />
                    <div className="property-meta">
                      <span className="address">{row.address}</span>
                      <span className="muted">{row.mlsId}</span>
                    </div>
                  </div>
                </td>
                <td>
                  <div className="property-meta">
                    <span className="badge">{row.status}</span>
                    <span className="muted">{row.mlsId}</span>
                  </div>
                </td>
                <td>
                  {row.city}, {row.state} {row.zip}
                </td>
                <td className="action-cell">
                  <div className="import-actions">
                    <button
                      className="import-primary"
                      onClick={() => goToImport()}
                      disabled={kycApproved === false}
                    >
                      Import Property
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="muted">
                  No results found. Try a different search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
