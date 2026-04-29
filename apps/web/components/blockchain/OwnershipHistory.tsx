import { buildExplorerHref, formatBlockchainHash, formatCurrency, formatDate } from "../../shared/format";

export type OwnershipHistoryItem = {
  id: string;
  tradedAt: string;
  direction: "BUY" | "SELL";
  sharesTraded: number;
  totalAmount: number;
  verificationStatus: string;
  blockchainRef?: string | null;
  buyer?: { email?: string | null } | null;
  seller?: { email?: string | null } | null;
};

type OwnershipHistoryProps = {
  items: OwnershipHistoryItem[];
  chainId?: number | null;
};

function formatParticipant(email?: string | null) {
  return email || "Operational ledger user";
}

export function OwnershipHistory({ items, chainId }: OwnershipHistoryProps) {
  if (!items.length) {
    return (
      <div className="ownership-history-empty">
        <strong>No ownership history yet</strong>
        <p className="muted">Completed transfers and purchases will appear here once the ledger updates.</p>
      </div>
    );
  }

  return (
    <div className="ownership-history-list">
      {items.map((item) => {
        const explorerHref = buildExplorerHref(item.blockchainRef, chainId);

        return (
          <article key={item.id} className="ownership-history-item">
            <div className="ownership-history-head">
              <div>
                <div className="dashboard-inline-badges">
                  <span className="badge subtle">{formatDate(item.tradedAt)}</span>
                  <span className="badge">{item.direction}</span>
                  <span
                    className={`badge ${item.verificationStatus === "VERIFIED" ? "success" : "subtle"}`}
                  >
                    {item.verificationStatus}
                  </span>
                </div>
                <strong>{item.sharesTraded} shares moved in the operational ledger</strong>
              </div>
              <strong>{formatCurrency(item.totalAmount)}</strong>
            </div>

            <div className="ownership-history-grid">
              <div>
                <span className="muted">From</span>
                <p>{formatParticipant(item.seller?.email)}</p>
              </div>
              <div>
                <span className="muted">To</span>
                <p>{formatParticipant(item.buyer?.email)}</p>
              </div>
              <div>
                <span className="muted">Blockchain hash</span>
                {item.blockchainRef ? (
                  <p>
                    {formatBlockchainHash(item.blockchainRef)}
                    {explorerHref ? (
                      <>
                        {" "}
                        <a
                          href={explorerHref}
                          className="home-inline-link"
                          target="_blank"
                          rel="noreferrer"
                        >
                          View proof
                        </a>
                      </>
                    ) : null}
                  </p>
                ) : (
                  <p>Not recorded yet</p>
                )}
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
