import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../lib/api";
import { EmptyState } from "../../components/ui/EmptyState";
import type { PaginatedResponse } from "../../shared/api-types";
import { PropertyCard } from "../../components/properties/PropertyCard";
import { ErrorState } from "../../components/ui/ErrorState";
import { LoadingState } from "../../components/ui/LoadingState";
import { PageHero } from "../../components/ui/PageHero";
import { FutureBadge } from "../../components/ui/FutureBadge";
import { SectionHeader } from "../../components/ui/SectionHeader";

type PropertyRow = {
  id: string;
  address1: string;
  city: string;
  state: string;
  zip: string;
  status: string;
  type: string;
  liquidityScore: number;
  targetRaise: number | null;
  estMonthlyRent: number | null;
  thumbnailUrl: string | null;
  documentCount: number;
  listing: { askingPrice: number; status: string } | null;
  verificationStatus: string;
};

export default function PropertiesPage() {
  const [rows, setRows] = useState<PropertyRow[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams({
      page: "1",
      pageSize: "24",
      sortBy: "createdAt",
      sortOrder: "desc",
    });
    if (status) params.set("status", status);

    apiFetch<PaginatedResponse<PropertyRow>>(`/v1/properties?${params.toString()}`)
      .then((response) => setRows(response.data))
      .catch((fetchError: any) =>
        setError(fetchError?.message || "Failed to load properties.")
      )
      .finally(() => setLoading(false));
  }, [status]);

  const filtered = useMemo(() => {
    if (!query.trim()) return rows;
    const term = query.toLowerCase();
    return rows.filter((row) =>
      [row.address1, row.city, row.state, row.zip].some((value) =>
        value.toLowerCase().includes(term)
      )
    );
  }, [query, rows]);

  if (loading && rows.length === 0) {
    return (
      <main className="screen-page">
        <PageHero
          eyebrow="Properties"
          title="Investment inventory"
          description="Curated property cards with valuation context, income estimates, and room for future AI and ownership verification layers."
          actions={<FutureBadge label="Verified Ownership" phase="PHASE_3_BLOCKCHAIN" />}
        />
        <LoadingState
          title="Loading properties"
          description="Preparing the current investor inventory."
        />
      </main>
    );
  }

  if (error && rows.length === 0) {
    return (
      <main className="screen-page">
        <PageHero
          eyebrow="Properties"
          title="Investment inventory"
          description="Curated property cards with valuation context, income estimates, and room for future AI and ownership verification layers."
          actions={<FutureBadge label="Verified Ownership" phase="PHASE_3_BLOCKCHAIN" />}
        />
        <ErrorState title="Properties unavailable" message={error} />
      </main>
    );
  }

  return (
    <main className="screen-page">
      <PageHero
        eyebrow="Properties"
        title="Investment inventory"
        description="Curated property cards with valuation context, income estimates, and room for future AI and ownership verification layers."
        actions={<FutureBadge label="Verified Ownership" phase="PHASE_3_BLOCKCHAIN" />}
      />

      <section className="card screen-filter-card">
        <div className="search-row screen-filter-row">
          <input
            className="input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by property, city, state, or zip"
          />
          <select className="select" value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">All statuses</option>
            <option value="LISTED">Listed</option>
            <option value="FUNDED">Funded</option>
            <option value="RENT_LISTED">Rent Listed</option>
          </select>
        </div>
      </section>

      <section className="card dashboard-section">
        <SectionHeader
          eyebrow="Marketplace View"
          title="Investor inventory"
          subtitle="Each card is structured to support the current demo while leaving space for AI diligence summaries and ownership verification later."
          aside={<span className="badge subtle">{filtered.length} properties</span>}
        />
      </section>

      {filtered.length === 0 ? (
        <EmptyState
          title="No properties found"
          description={
            query.trim() || status
              ? "Try clearing the current search or status filter."
              : "Property inventory will appear here once assets are available."
          }
        />
      ) : (
        <section className="dashboard-card-grid property-grid">
          {filtered.map((property) => (
            <PropertyCard
              key={property.id}
              id={property.id}
              title={property.address1}
              location={`${property.city}, ${property.state} ${property.zip}`}
              status={property.status}
              valuation={property.listing?.askingPrice ?? property.targetRaise}
              monthlyIncomeEstimate={property.estMonthlyRent}
              thumbnailUrl={property.thumbnailUrl}
              verificationStatus={property.verificationStatus}
              documentCount={property.documentCount}
            />
          ))}
        </section>
      )}
    </main>
  );
}
