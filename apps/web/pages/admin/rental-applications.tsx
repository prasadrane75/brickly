import { FormEvent, useEffect, useState } from "react";
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
    <main>
      <h1 className="section-title">Rental Applications</h1>
      {loading && <p>Loading applications...</p>}
      {message && (
        <p className={status === "error" ? "status-error" : "status-success"}>
          {message}
        </p>
      )}
      {applications.length === 0 ? (
        <p>No pending applications.</p>
      ) : (
        applications.map((app) => (
          <section key={app.id} className="card">
            <h3>
              {app.property.address1}, {app.property.city}
            </h3>
            <p>
              {app.property.city}, {app.property.state} {app.property.zip}
            </p>
            <p>Property status: {app.property.status}</p>
            <p>
              Tenant: {app.tenant.email || app.tenant.phone || app.tenant.id}
            </p>
            <p>Submitted: {new Date(app.createdAt).toLocaleString()}</p>
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
              <button type="submit" className="button">
                Approve
              </button>
              <button
                type="button"
                onClick={() => handleReject(app.id)}
                className="button secondary"
              >
                Reject
              </button>
            </form>
          </section>
        ))
      )}
    </main>
  );
}
