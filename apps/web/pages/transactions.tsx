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
import { aiClient, type AiTransactionExplanationResult } from "../services/ai";

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
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [explanations, setExplanations] = useState<Record<string, AiTransactionExplanationResult>>({});
  const [loadingExplainId, setLoadingExplainId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [explainError, setExplainError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<PaginatedResponse<Transaction>>("/v1/transactions?page=1&pageSize=20")
      .then((response) => setRows(response.data))
      .catch((fetchError: any) =>
        setPageError(fetchError?.message || "Transaction history unavailable.")
      )
      .finally(() => setLoading(false));
  }, []);

  async function handleExplain(transactionId: string) {
    if (expandedId === transactionId && explanations[transactionId]) {
      setExpandedId(null);
      return;
    }

    setExpandedId(transactionId);

    if (explanations[transactionId]) {
      return;
    }

    setLoadingExplainId(transactionId);
    setExplainError(null);

    try {
      const explanation = await aiClient.explainTransaction(transactionId);
      setExplanations((current) => ({
        ...current,
        [transactionId]: explanation,
      }));
    } catch (fetchError: any) {
      setExplainError(fetchError?.message || "Transaction explanation unavailable.");
    } finally {
      setLoadingExplainId(null);
    }
  }

  if (loading) {
    return (
      <LoadingState
        title="Loading transactions"
        description="Preparing the recent trade ledger."
      />
    );
  }

  if (pageError) {
    return <ErrorState title="Transactions unavailable" message={pageError} />;
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
          subtitle="Executed purchases and transfers with an optional AI-generated plain-English explanation."
          aside={<span className="badge subtle">{rows.length} records</span>}
        />
        {explainError ? <p className="status-error">{explainError}</p> : null}
        <ActivityList
          items={rows}
          emptyTitle="No transactions"
          emptyDescription="Executed buys and sells will appear here."
          renderItem={(row) => (
            <div key={row.id} className="transaction-explanation-block">
              <div className="dashboard-list-row">
                <div>
                  <strong>{row.property.name}</strong>
                  <p className="muted">
                    {row.property.city}, {row.property.state} · {row.direction} · {row.sharesTraded} shares
                  </p>
                </div>
                <div className="dashboard-list-right">
                  <strong>{formatCurrency(row.totalAmount)}</strong>
                  <span className="muted">{formatDate(row.tradedAt)}</span>
                  <button
                    className="button secondary"
                    type="button"
                    onClick={() => handleExplain(row.id)}
                    disabled={loadingExplainId === row.id}
                  >
                    {loadingExplainId === row.id
                      ? "Explaining..."
                      : expandedId === row.id && explanations[row.id]
                        ? "Hide"
                        : "Explain"}
                  </button>
                </div>
              </div>

              {expandedId === row.id ? (
                <div className="transaction-ai-panel">
                  {loadingExplainId === row.id && !explanations[row.id] ? (
                    <p className="muted">Generating AI explanation...</p>
                  ) : explanations[row.id] ? (
                    <>
                      <div className="transaction-ai-panel-header">
                        <span className="badge subtle">AI-generated explanation</span>
                        <span className="muted">
                          {explanations[row.id].provider} · {explanations[row.id].model}
                        </span>
                      </div>
                      <strong>{explanations[row.id].headline}</strong>
                      <p>{explanations[row.id].explanation}</p>
                      <div className="transaction-ai-grid">
                        <div>
                          <span className="muted">Impact</span>
                          <p>{explanations[row.id].impactSummary}</p>
                        </div>
                        <div>
                          <span className="muted">Related property</span>
                          <p>{explanations[row.id].relatedProperty}</p>
                        </div>
                        <div>
                          <span className="muted">Status note</span>
                          <p>{explanations[row.id].transactionStatusNote}</p>
                        </div>
                      </div>
                    </>
                  ) : null}
                </div>
              ) : null}
            </div>
          )}
        />
      </div>
    </main>
  );
}
