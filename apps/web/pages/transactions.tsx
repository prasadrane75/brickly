import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
import { ActivityList } from "../components/dashboard/ActivityList";
import { ErrorState } from "../components/ui/ErrorState";
import { LoadingState } from "../components/ui/LoadingState";
import { PageHero } from "../components/ui/PageHero";
import { FutureBadge } from "../components/ui/FutureBadge";
import { SectionHeader } from "../components/ui/SectionHeader";
import type { PaginatedResponse } from "../shared/api-types";
import { formatCurrency, formatDate } from "../shared/format";

type Transaction = {
  id: string;
  direction: "BUY" | "SELL";
  sharesTraded: number;
  totalAmount: number;
  tradedAt: string;
  property: { name: string; city: string; state: string };
};

export default function TransactionsPage() {
  const [rows, setRows] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<PaginatedResponse<Transaction>>("/v1/transactions?page=1&pageSize=20")
      .then((response) => setRows(response.data))
      .catch((fetchError: any) =>
        setError(fetchError?.message || "Transaction history unavailable.")
      )
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <LoadingState
        title="Loading transactions"
        description="Preparing the recent trade ledger."
      />
    );
  }

  if (error) {
    return <ErrorState title="Transactions unavailable" message={error} />;
  }

  return (
    <main className="screen-page">
      <PageHero
        eyebrow="Transactions"
        title="Recent trade history"
        description="A clean ledger of buy and sell activity for investor walkthroughs."
        actions={<FutureBadge label="Verified Ownership" phase="PHASE_3_BLOCKCHAIN" />}
      />

      <div className="card dashboard-section">
        <SectionHeader
          eyebrow="Ledger"
          title="Completed transactions"
          subtitle="Executed purchases and transfers already available in Phase 1."
          aside={<span className="badge subtle">{rows.length} records</span>}
        />
        <ActivityList
          items={rows}
          emptyTitle="No transactions"
          emptyDescription="Executed buys and sells will appear here."
          renderItem={(row) => (
            <div key={row.id} className="dashboard-list-row">
              <div>
                <strong>{row.property.name}</strong>
                <p className="muted">
                  {row.property.city}, {row.property.state} · {row.direction} · {row.sharesTraded} shares
                </p>
              </div>
              <div className="dashboard-list-right">
                <strong>{formatCurrency(row.totalAmount)}</strong>
                <span className="muted">{formatDate(row.tradedAt)}</span>
              </div>
            </div>
          )}
        />
      </div>
    </main>
  );
}
