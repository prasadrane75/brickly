import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
import { ActivityList } from "../components/dashboard/ActivityList";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorState } from "../components/ui/ErrorState";
import { LoadingState } from "../components/ui/LoadingState";
import { PageHero } from "../components/ui/PageHero";
import { FutureBadge } from "../components/ui/FutureBadge";
import { SectionHeader } from "../components/ui/SectionHeader";
import { StatusBadge } from "../components/ui/StatusBadge";
import type { ApiResponse, PaginatedResponse } from "../shared/api-types";
import { formatDate } from "../shared/format";

type DocumentRow = {
  id: string;
  fileName: string;
  entityType: string;
  kind: string;
  status: string;
  verificationStatus: string;
  fileUrl: string;
  createdAt: string;
  linkedEntity: {
    type: "PROPERTY" | "TRANSACTION" | "USER" | "ADMIN_NOTE";
    id: string | null;
    label: string;
  };
  uploadedBy?: {
    id: string;
    email: string | null;
    role: string;
  } | null;
};

type PropertyOption = {
  id: string;
  address1: string;
  city: string;
  state: string;
};

type UserProfile = {
  id: string;
  email: string | null;
  role: string;
};

const documentKinds = [
  "DEED",
  "APPRAISAL",
  "INSPECTION",
  "OFFERING_MEMO",
  "KYC",
  "TRADE_CONFIRMATION",
  "SUBSCRIPTION_AGREEMENT",
  "OTHER",
] as const;

const documentStatuses = ["DRAFT", "ACTIVE", "ARCHIVED"] as const;
const linkTargetTypes = ["PROPERTY", "TRANSACTION", "USER", "ADMIN_NOTE"] as const;

export default function DocumentsPage() {
  const [rows, setRows] = useState<DocumentRow[]>([]);
  const [properties, setProperties] = useState<PropertyOption[]>([]);
  const [me, setMe] = useState<UserProfile | null>(null);
  const [kindFilter, setKindFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [linkTargetType, setLinkTargetType] = useState<(typeof linkTargetTypes)[number]>("PROPERTY");
  const [propertyId, setPropertyId] = useState("");
  const [linkTargetId, setLinkTargetId] = useState("");
  const [fileName, setFileName] = useState("");
  const [kind, setKind] = useState<(typeof documentKinds)[number]>("OFFERING_MEMO");
  const [status, setStatus] = useState<(typeof documentStatuses)[number]>("ACTIVE");
  const [notes, setNotes] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function loadDocuments() {
    const params = new URLSearchParams({
      page: "1",
      pageSize: "30",
    });
    if (kindFilter) params.set("kind", kindFilter);
    if (statusFilter) params.set("status", statusFilter);

    const response = await apiFetch<PaginatedResponse<DocumentRow>>(
      `/v1/documents/by-entity?${params.toString()}`
    );
    setRows(response.data);
  }

  useEffect(() => {
    Promise.all([
      loadDocuments(),
      apiFetch<PaginatedResponse<PropertyOption>>("/v1/properties?page=1&pageSize=50"),
      apiFetch<ApiResponse<UserProfile>>("/v1/users/me"),
    ])
      .then(([, propertyResponse, meResponse]) => {
        setProperties(propertyResponse.data);
        setMe(meResponse.data);

        if (propertyResponse.data[0]) {
          setPropertyId(propertyResponse.data[0].id);
          setLinkTargetId(propertyResponse.data[0].id);
        }
      })
      .catch((fetchError: any) =>
        setError(fetchError?.message || "Document workspace could not be loaded.")
      )
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadDocuments();
  }, [kindFilter, statusFilter]);

  useEffect(() => {
    if (linkTargetType === "PROPERTY") {
      setLinkTargetId(propertyId);
      return;
    }

    if (linkTargetType === "USER" && me?.id) {
      setLinkTargetId(me.id);
      return;
    }

    setLinkTargetId("");
  }, [linkTargetType, propertyId, me?.id]);

  function handleFileSelection(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setSelectedFile(file);
    if (file) {
      setFileName(file.name);
    }
  }

  if (loading && rows.length === 0) {
    return (
      <main className="screen-page">
        <PageHero
          eyebrow="Documents"
          title="Operational document library"
          description="Property, investor, transaction, and admin-reference attachments with a clean Phase 1 storage abstraction."
          actions={<FutureBadge label="AI Insights" phase="PHASE_2_AI" />}
        />
        <LoadingState
          title="Loading documents"
          description="Preparing the document library and upload workspace."
        />
      </main>
    );
  }

  if (!loading && error && rows.length === 0 && properties.length === 0 && !me) {
    return (
      <main className="screen-page">
        <PageHero
          eyebrow="Documents"
          title="Operational document library"
          description="Property, investor, transaction, and admin-reference attachments with a clean Phase 1 storage abstraction."
          actions={<FutureBadge label="AI Insights" phase="PHASE_2_AI" />}
        />
        <ErrorState title="Documents unavailable" message={error} />
      </main>
    );
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);
    setError(null);

    try {
      if (!linkTargetId) {
        throw new Error("Select or enter a linked entity before attaching a document.");
      }
      const payload = {
        fileName: fileName || selectedFile?.name || "phase-1-document.txt",
        mimeType: selectedFile?.type || "application/octet-stream",
        fileSizeBytes: selectedFile?.size || undefined,
        kind,
        status,
        propertyId: linkTargetType === "PROPERTY" ? propertyId : undefined,
        tradeId: linkTargetType === "TRANSACTION" ? linkTargetId : undefined,
        notes: notes || undefined,
        linkTarget: {
          type: linkTargetType,
          id: linkTargetType === "PROPERTY" ? propertyId : linkTargetId,
        },
      };

      const response = await apiFetch<ApiResponse<DocumentRow>>("/v1/documents/upload-stub", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setMessage(`Document attached: ${response.data.fileName}`);
      setFileName("");
      setNotes("");
      setSelectedFile(null);
      await loadDocuments();
    } catch (submitError: any) {
      setError(submitError.message || "Document upload failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="screen-page">
      <PageHero
        eyebrow="Documents"
        title="Operational document library"
        description="Property, investor, transaction, and admin-reference attachments with a clean Phase 1 storage abstraction."
        actions={<FutureBadge label="AI Insights" phase="PHASE_2_AI" />}
      />

      <section className="dashboard-grid dashboard-main-grid">
        <div className="card dashboard-section">
          <SectionHeader
            eyebrow="Attach Document"
            title="Stub upload flow"
            subtitle="This Phase 1 flow stores local metadata and a dev placeholder artifact so cloud storage can be introduced later without rewriting the attachment surface."
          />

          <form className="grid document-form-grid" onSubmit={handleSubmit}>
            <div>
              <label className="label">Link target</label>
              <select
                className="select"
                value={linkTargetType}
                onChange={(event) =>
                  setLinkTargetType(event.target.value as (typeof linkTargetTypes)[number])
                }
              >
                {linkTargetTypes.map((option) => (
                  <option key={option} value={option}>
                    {option.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </div>

            {linkTargetType === "PROPERTY" ? (
              <div>
                <label className="label">Property</label>
                <select
                  className="select"
                  value={propertyId}
                  onChange={(event) => setPropertyId(event.target.value)}
                  disabled={properties.length === 0}
                >
                  {properties.map((property) => (
                    <option key={property.id} value={property.id}>
                      {property.address1} · {property.city}, {property.state}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label className="label">
                  {linkTargetType === "TRANSACTION"
                    ? "Transaction ID"
                    : linkTargetType === "USER"
                      ? "User ID"
                      : "Admin Note Key"}
                </label>
                <input
                  className="input"
                  value={linkTargetId}
                  onChange={(event) => setLinkTargetId(event.target.value)}
                  placeholder={
                    linkTargetType === "ADMIN_NOTE"
                      ? "ops-review-q1"
                      : "Enter linked entity id"
                  }
                />
              </div>
            )}

            <div>
              <label className="label">Document Type</label>
              <select
                className="select"
                value={kind}
                onChange={(event) => setKind(event.target.value as (typeof documentKinds)[number])}
              >
                {documentKinds.map((option) => (
                  <option key={option} value={option}>
                    {option.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Status</label>
              <select
                className="select"
                value={status}
                onChange={(event) =>
                  setStatus(event.target.value as (typeof documentStatuses)[number])
                }
              >
                {documentStatuses.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Local file</label>
              <input className="input" type="file" onChange={handleFileSelection} />
            </div>

            <div>
              <label className="label">Display name</label>
              <input
                className="input"
                value={fileName}
                onChange={(event) => setFileName(event.target.value)}
                placeholder="Q2 Offering Memo.pdf"
              />
            </div>

            <div className="document-form-span">
              <label className="label">Notes</label>
              <textarea
                className="textarea"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={4}
                placeholder="Optional context for admins or investors reviewing this attachment."
              />
            </div>

            <div className="order-form-actions">
              <button
                className="button"
                type="submit"
                disabled={submitting || !linkTargetId || !(fileName || selectedFile)}
              >
                {submitting ? "Attaching..." : "Attach Document"}
              </button>
            </div>
          </form>

          {message ? <p className="status-success">{message}</p> : null}
          {error ? <p className="status-error">{error}</p> : null}

          {/* PHASE_2_AI: document extraction and summarization should read the stored attachment metadata and storage key rather than altering this upload form. */}
        </div>

        <aside className="card dashboard-section">
          <SectionHeader
            eyebrow="Storage Design"
            title="Phase 1 attachment model"
            subtitle="Document records stay stable while the storage implementation remains swappable."
          />
          <div className="dashboard-list">
            <div className="dashboard-list-row">
              <div>
                <strong>Metadata in Postgres</strong>
                <p className="muted">File name, type, status, link target, uploader, and future summary hooks.</p>
              </div>
              <span className="badge subtle">Current</span>
            </div>
            <div className="dashboard-list-row">
              <div>
                <strong>Local stub storage</strong>
                <p className="muted">A local placeholder artifact is generated for demo use instead of production object storage.</p>
              </div>
              <span className="badge subtle">Phase 1</span>
            </div>
            <div className="dashboard-list-row">
              <div>
                <strong>Cloud storage ready</strong>
                <p className="muted">The storage service can later swap to S3 or similar without changing callers.</p>
              </div>
              <FutureBadge label="PHASE_2_AI" phase="PHASE_2_AI" />
            </div>
          </div>
        </aside>
      </section>

      <div className="card screen-filter-card dashboard-section">
        <SectionHeader
          eyebrow="Filters"
          title="Document index"
          subtitle="Browse the Phase 1 library by type or lifecycle status."
          aside={<span className="badge subtle">{rows.length} files</span>}
        />
        <div className="search-row compact-filter-row">
          <select className="select" value={kindFilter} onChange={(event) => setKindFilter(event.target.value)}>
            <option value="">All document types</option>
            {documentKinds.map((option) => (
              <option key={option} value={option}>
                {option.replaceAll("_", " ")}
              </option>
            ))}
          </select>
          <select className="select" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="">All statuses</option>
            {documentStatuses.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="card dashboard-section">
        <SectionHeader
          eyebrow="Diligence"
          title="Document index"
          subtitle="Property, investor, transaction, and admin-reference files already available for demo review."
        />
        {rows.length === 0 ? (
          <EmptyState
            title="No documents found"
            description="Upload a document or clear the current filters to see the library."
          />
        ) : (
          <ActivityList
            items={rows}
            emptyTitle="No documents"
            emptyDescription="Uploaded diligence files will appear here."
            renderItem={(row) => (
              <div key={row.id} className="dashboard-list-row">
                <div>
                  <strong>{row.fileName}</strong>
                  <p className="muted">
                    {row.kind.replaceAll("_", " ")} · {row.status} · linked to {row.linkedEntity.label}
                  </p>
                  <p className="muted">
                    {row.entityType} · uploaded by {row.uploadedBy?.email || row.uploadedBy?.role || "system"}
                  </p>
                </div>
                <div className="dashboard-list-right">
                  <StatusBadge value={row.status} />
                  <StatusBadge value={row.verificationStatus} />
                  <span className="muted">{formatDate(row.createdAt)}</span>
                  <a href={row.fileUrl} className="home-inline-link" target="_blank" rel="noreferrer">
                    Open
                  </a>
                </div>
              </div>
            )}
          />
        )}
      </div>
    </main>
  );
}
