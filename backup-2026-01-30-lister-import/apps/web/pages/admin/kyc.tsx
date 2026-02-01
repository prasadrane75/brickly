import { Fragment, useEffect, useState } from "react";
import { apiFetch } from "../../lib/api";

type Submission = {
  id: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  submittedAt: string;
  data: Record<string, unknown>;
  user: {
    id: string;
    email: string | null;
    phone: string | null;
    role: string;
    createdAt: string;
  };
};

export default function AdminKycPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  function loadSubmissions() {
    return apiFetch<Submission[]>("/kyc/submissions")
      .then(setSubmissions)
      .catch((err) => {
        setMessage(err.message || "Failed to load submissions.");
        setStatus("error");
      });
  }

  useEffect(() => {
    loadSubmissions();
  }, []);

  async function handleDecision(userId: string, decision: "approve" | "reject") {
    setMessage(null);
    setStatus("idle");
    try {
      await apiFetch(`/kyc/${decision}`, {
        method: "POST",
        body: JSON.stringify({ userId }),
      });
      setMessage(`KYC ${decision}d.`);
      setStatus("success");
      await loadSubmissions();
    } catch (error: any) {
      setMessage(error.message || "Failed to update KYC.");
      setStatus("error");
    }
  }

  return (
    <main className="import-page">
      <section className="import-header">
        <h1>KYC Submissions</h1>
        <p>Review pending KYC submissions and take action.</p>
      </section>
      {message && (
        <p className={status === "error" ? "status-error" : "status-success"}>
          {message}
        </p>
      )}
      <div className="import-card">
        <table className="import-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Role</th>
              <th>Submitted</th>
              <th>Status</th>
              <th className="action-cell">Actions</th>
            </tr>
          </thead>
          <tbody>
            {submissions.map((submission) => (
              <Fragment key={submission.id}>
                <tr>
                  <td>
                    {submission.user.email ||
                      submission.user.phone ||
                      submission.user.id}
                  </td>
                  <td>{submission.user.role}</td>
                  <td>{new Date(submission.submittedAt).toLocaleString()}</td>
                  <td>
                    <span className="badge">{submission.status}</span>
                  </td>
                  <td className="action-cell">
                    <div className="import-actions">
                      <button
                        className="import-primary"
                        onClick={() => handleDecision(submission.user.id, "approve")}
                      >
                        Approve
                      </button>
                      <button
                        className="import-secondary"
                        onClick={() => handleDecision(submission.user.id, "reject")}
                      >
                        Reject
                      </button>
                      <button
                        className="import-secondary"
                        onClick={() =>
                          setExpandedId((prev) =>
                            prev === submission.id ? null : submission.id
                          )
                        }
                      >
                        {expandedId === submission.id ? "Hide" : "Details"}
                      </button>
                    </div>
                  </td>
                </tr>
                {expandedId === submission.id && (
                  <tr>
                    <td colSpan={5}>
                      <pre
                        style={{
                          background: "#f7f7f7",
                          padding: 12,
                          borderRadius: 10,
                          margin: 0,
                        }}
                      >
                        {JSON.stringify(submission.data, null, 2)}
                      </pre>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
            {submissions.length === 0 && (
              <tr>
                <td colSpan={5} className="muted">
                  No pending submissions.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
