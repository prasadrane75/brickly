import { Fragment, FormEvent, useEffect, useState } from "react";
import { apiFetch } from "../../lib/api";

type Application = {
  id: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
  rentAmount: string | null;
  property: {
    id: string;
    address1: string;
    city: string;
    state: string;
    zip: string;
    status: string;
  };
  tenant: {
    id: string;
    email: string | null;
    phone: string | null;
    role: string;
    createdAt: string;
  };
};

export default function AdminRentalApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [loading, setLoading] = useState(true);
  const [rentAmounts, setRentAmounts] = useState<Record<string, string>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);

  function loadApplications() {
    setLoading(true);
    return apiFetch<Application[]>("/admin/rental-applications")
      .then((data) => {
        setApplications(data);
        setRentAmounts((prev) => {
          const next = { ...prev };
          data.forEach((app) => {
            if (next[app.id] === undefined) {
              next[app.id] = app.rentAmount ?? "";
            }
          });
          return next;
        });
      })
      .catch((err) => {
        setMessage(err.message || "Failed to load applications.");
        setStatus("error");
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadApplications();
  }, []);

  async function handleApprove(
    event: FormEvent,
    applicationId: string,
    rentAmount: string
  ) {
    event.preventDefault();
    setMessage(null);
    setStatus("idle");
    try {
      await apiFetch("/admin/rental-applications/approve", {
        method: "POST",
        body: JSON.stringify({
          applicationId,
          rentAmount: rentAmount ? Number(rentAmount) : undefined,
        }),
      });
      setMessage("Application approved.");
      setStatus("success");
      await loadApplications();
    } catch (error: any) {
      setMessage(error.message || "Failed to approve.");
      setStatus("error");
    }
  }

  async function handleReject(applicationId: string) {
    setMessage(null);
    setStatus("idle");
    try {
      await apiFetch("/admin/rental-applications/reject", {
        method: "POST",
        body: JSON.stringify({ applicationId }),
      });
      setMessage("Application rejected.");
      setStatus("success");
      await loadApplications();
    } catch (error: any) {
      setMessage(error.message || "Failed to reject.");
      setStatus("error");
    }
  }

  return (
    <main className="import-page">
      <section className="import-header">
        <h1>Rental Applications</h1>
        <p>Review rental applications and approve or reject.</p>
      </section>
      {loading && <p>Loading applications...</p>}
      {message && (
        <p className={status === "error" ? "status-error" : "status-success"}>
          {message}
        </p>
      )}
      <div className="import-card">
        <table className="import-table">
          <thead>
            <tr>
              <th>Property</th>
              <th>Tenant</th>
              <th>Status</th>
              <th>Submitted</th>
              <th className="action-cell">Actions</th>
            </tr>
          </thead>
          <tbody>
            {applications.map((app) => (
              <Fragment key={app.id}>
                <tr>
                  <td>
                    <div className="property-meta">
                      <span className="address">{app.property.address1}</span>
                      <span className="muted">
                        {app.property.city}, {app.property.state} {app.property.zip}
                      </span>
                    </div>
                  </td>
                  <td>{app.tenant.email || app.tenant.phone || app.tenant.id}</td>
                  <td>
                    <span className="badge">{app.status}</span>
                  </td>
                  <td>{new Date(app.createdAt).toLocaleString()}</td>
                  <td className="action-cell">
                    <div className="import-actions">
                      <button
                        className="import-secondary"
                        onClick={() =>
                          setExpandedId((prev) => (prev === app.id ? null : app.id))
                        }
                      >
                        {expandedId === app.id ? "Hide" : "Details"}
                      </button>
                    </div>
                  </td>
                </tr>
                {expandedId === app.id && (
                  <tr>
                    <td colSpan={5}>
                      <form
                        onSubmit={(event) =>
                          handleApprove(event, app.id, rentAmounts[app.id] ?? "")
                        }
                        className="form"
                      >
                        <div>
                          <label className="label">Rent amount (monthly)</label>
                          <input
                            className="input"
                            type="number"
                            min={0}
                            value={rentAmounts[app.id] ?? ""}
                            onChange={(e) => {
                              setRentAmounts((prev) => ({
                                ...prev,
                                [app.id]: e.target.value,
                              }));
                            }}
                          />
                        </div>
                        <div className="button-row">
                          <button type="submit" className="import-primary">
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => handleReject(app.id)}
                            className="import-secondary"
                          >
                            Reject
                          </button>
                        </div>
                      </form>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
            {applications.length === 0 && !loading && (
              <tr>
                <td colSpan={5} className="muted">
                  No pending applications.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
