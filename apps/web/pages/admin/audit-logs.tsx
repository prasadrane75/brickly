import { Fragment, useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../lib/api";
import { ErrorState } from "../../components/ui/ErrorState";
import { LoadingState } from "../../components/ui/LoadingState";
import { PageHero } from "../../components/ui/PageHero";
import { FutureBadge } from "../../components/ui/FutureBadge";
import { SectionHeader } from "../../components/ui/SectionHeader";
import { StatusBadge } from "../../components/ui/StatusBadge";
import {
  aiClient,
  type AiAnomalyDetectionResult,
  type AiAuditSummaryResult,
} from "../../services/ai";
import { formatDateTime } from "../../shared/format";

type AuditLog = {
  id: string;
  actorType: string;
  actorLabel: string;
  action: string;
  entityType: string;
  entityId: string | null;
  targetUserId: string | null;
  propertyId: string | null;
  tradeId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  summary: string;
  propertyProof: {
    verificationStatus: string;
    blockchainRef: string | null;
    latestRecordStatus: string | null;
    contractAddress: string | null;
  } | null;
  tradeProof: {
    verificationStatus: string;
    blockchainRef: string | null;
    latestRecordStatus: string | null;
    contractAddress: string | null;
  } | null;
  actorUser: {
    id: string;
    email: string | null;
    phone: string | null;
    role: string;
  } | null;
};

const actionOptions = [
  "",
  "CREATE",
  "UPDATE",
  "DELETE",
  "APPROVE",
  "REJECT",
  "LOGIN",
  "EXPORT",
  "CONFIG_CHANGE",
];

const actorTypeOptions = ["", "ADMIN", "USER", "SYSTEM"];

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [auditSummary, setAuditSummary] = useState<AiAuditSummaryResult | null>(null);
  const [anomalySummary, setAnomalySummary] = useState<AiAnomalyDetectionResult | null>(null);
  const [action, setAction] = useState("");
  const [actorType, setActorType] = useState("");
  const [entityType, setEntityType] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const entityTypeOptions = useMemo(() => {
    return Array.from(new Set(logs.map((log) => log.entityType))).sort();
  }, [logs]);

  async function loadLogs() {
    setLoading(true);
    setMessage(null);
    setStatus("idle");

    const params = new URLSearchParams();
    if (action) params.set("action", action);
    if (actorType) params.set("actorType", actorType);
    if (entityType) params.set("entityType", entityType);
    params.set("limit", "100");

    try {
      const data = await apiFetch<{ data: AuditLog[] }>(`/v1/admin/audit-history?${params.toString()}`);
      setLogs(data.data);
      const [summary, anomalies] = await Promise.all([
        aiClient.summarizeAudit({
          limit: 25,
          action: action || undefined,
          actorType: actorType || undefined,
          entityType: entityType || undefined,
        }),
        aiClient.detectAnomalies({ limit: 10 }),
      ]);
      setAuditSummary(summary);
      setAnomalySummary(anomalies);
      setStatus("success");
    } catch (error: any) {
      setMessage(error.message || "Failed to load audit logs.");
      setStatus("error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLogs();
  }, [action, actorType, entityType]);

  if (loading && logs.length === 0) {
    return (
      <main className="screen-page">
        <PageHero
          eyebrow="Admin Audit"
          title="Operational history"
          description="Admin-only activity history for approvals, configuration changes, uploads, and tracked actions."
          actions={<FutureBadge label="Verified Ownership" phase="PHASE_3_BLOCKCHAIN" />}
        />
        <LoadingState
          title="Loading audit logs"
          description="Preparing the admin operational history."
        />
      </main>
    );
  }

  if (!loading && message && logs.length === 0) {
    return (
      <main className="screen-page">
        <PageHero
          eyebrow="Admin Audit"
          title="Operational history"
          description="Admin-only activity history for approvals, configuration changes, uploads, and tracked actions."
          actions={<FutureBadge label="Verified Ownership" phase="PHASE_3_BLOCKCHAIN" />}
        />
        <ErrorState title="Audit logs unavailable" message={message} />
      </main>
    );
  }

  return (
    <main className="screen-page">
      <PageHero
        eyebrow="Admin Audit"
        title="Operational history"
        description="Admin-only activity history for approvals, configuration changes, uploads, and tracked actions."
        actions={<FutureBadge label="Verified Ownership" phase="PHASE_3_BLOCKCHAIN" />}
      />

      <div className="card screen-filter-card dashboard-section">
        <SectionHeader
          eyebrow="Filters"
          title="Audit query controls"
          subtitle="Narrow the operational history by action, actor, or entity domain."
        />
        <div className="search-row screen-filter-row compact-filter-row">
          <select className="select" value={action} onChange={(event) => setAction(event.target.value)}>
            {actionOptions.map((option) => (
              <option key={option || "all-actions"} value={option}>
                {option || "All actions"}
              </option>
            ))}
          </select>

          <select className="select" value={actorType} onChange={(event) => setActorType(event.target.value)}>
            {actorTypeOptions.map((option) => (
              <option key={option || "all-actors"} value={option}>
                {option || "All actor types"}
              </option>
            ))}
          </select>

          <select className="select" value={entityType} onChange={(event) => setEntityType(event.target.value)}>
            <option value="">All entity types</option>
            {entityTypeOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      </div>

      {auditSummary ? (
        <section className="dashboard-grid dashboard-main-grid">
          <div className="card dashboard-section">
            <SectionHeader
              eyebrow="AI Audit Summary"
              title="Executive narrative"
              subtitle="A concise summary grounded in the filtered audit stream and blockchain proof coverage."
            />
            <div className="dashboard-inline-badges">
              <span className="badge success">Verified Insight</span>
              <span className="badge subtle">
                {auditSummary.verificationCoverage}% proof coverage
              </span>
            </div>
            <p>{auditSummary.summary}</p>
            <div className="dashboard-list">
              {auditSummary.keyEvents.map((event) => (
                <div key={event} className="dashboard-list-row">
                  <strong>Key event</strong>
                  <span>{event}</span>
                </div>
              ))}
            </div>
            {auditSummary.anomalies.length ? (
              <div className="dashboard-list">
                {auditSummary.anomalies.map((item) => (
                  <div key={item} className="dashboard-list-row">
                    <strong>Coverage gap</strong>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <aside className="card dashboard-section">
            <SectionHeader
              eyebrow="Anomaly Alerts"
              title="Flagged inconsistencies"
              subtitle="Rule-based checks explained by the AI layer."
            />
            {anomalySummary ? (
              <>
                <div className="dashboard-inline-badges">
                  <span
                    className={`badge ${
                      anomalySummary.severity === "HIGH" || anomalySummary.severity === "MEDIUM"
                        ? "success"
                        : "subtle"
                    }`}
                  >
                    {anomalySummary.severity} severity
                  </span>
                  <span className="muted">
                    {anomalySummary.provider} · {anomalySummary.model}
                  </span>
                </div>
                <p>{anomalySummary.explanation}</p>
                <div className="dashboard-list">
                  {anomalySummary.anomalies.map((item) => (
                    <div key={`${item.category}-${item.referenceId || item.title}`} className="dashboard-list-row">
                      <strong>{item.title}</strong>
                      <span>
                        {item.category} · {item.severity}
                        {item.referenceId ? ` · ${item.referenceId}` : ""}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="muted">No anomaly analysis available for the current audit slice.</p>
            )}
          </aside>
        </section>
      ) : null}

      {message && logs.length > 0 && (
        <p className={status === "error" ? "status-error" : "status-success"}>
          {message}
        </p>
      )}

      <div className="card dashboard-section">
        <SectionHeader
          eyebrow="Admin Only"
          title="Audit event stream"
          subtitle="This view is intentionally limited to admin users because it contains operationally sensitive events."
          aside={<span className="badge subtle">{logs.length} events</span>}
        />
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Actor</th>
                <th>Action</th>
                <th>Entity</th>
                <th>Refs</th>
                <th className="action-cell">Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <Fragment key={log.id}>
                  <tr>
                    <td>{formatDateTime(log.createdAt)}</td>
                    <td>
                      <div className="property-meta">
                        <span className="address">{log.actorLabel}</span>
                        <span className="muted">{log.actorType}</span>
                      </div>
                    </td>
                    <td>
                      <StatusBadge value={log.action} />
                    </td>
                    <td>
                      <div className="property-meta">
                        <span className="address">{log.entityType}</span>
                        <span className="muted">{log.entityId || "No entity id"}</span>
                        <span className="muted">{log.summary}</span>
                      </div>
                    </td>
                    <td>
                      <div className="property-meta">
                        <span className="muted">property: {log.propertyId || "—"}</span>
                        <span className="muted">trade: {log.tradeId || "—"}</span>
                        <span className="muted">
                          proof: {log.tradeProof?.blockchainRef || log.propertyProof?.blockchainRef || "—"}
                        </span>
                      </div>
                    </td>
                    <td className="action-cell">
                      <button
                        className="button secondary small-button"
                        onClick={() =>
                          setExpandedId((prev) => (prev === log.id ? null : log.id))
                        }
                      >
                        {expandedId === log.id ? "Hide" : "View"}
                      </button>
                    </td>
                  </tr>
                  {expandedId === log.id && (
                    <tr>
                      <td colSpan={6}>
                        <pre className="audit-pre">
                          {JSON.stringify(
                            {
                              actorUser: log.actorUser,
                              targetUserId: log.targetUserId,
                              propertyProof: log.propertyProof,
                              tradeProof: log.tradeProof,
                              metadata: log.metadata,
                            },
                            null,
                            2
                          )}
                        </pre>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
              {logs.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="muted">
                    No audit logs found for the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
