import { useEffect, useState } from "react";
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
    <main>
      <h1 className="section-title">KYC Submissions</h1>
      {message && (
        <p className={status === "error" ? "status-error" : "status-success"}>
          {message}
        </p>
      )}
      {submissions.length === 0 ? (
        <p>No pending submissions.</p>
      ) : (
        submissions.map((submission) => (
          <section key={submission.id} className="card">
            <h3>
              {submission.user.email || submission.user.phone || submission.user.id}
            </h3>
            <p>Role: {submission.user.role}</p>
            <p>Submitted: {new Date(submission.submittedAt).toLocaleString()}</p>
            <pre style={{ background: "#f7f7f7", padding: 12, borderRadius: 10 }}>
              {JSON.stringify(submission.data, null, 2)}
            </pre>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                className="button"
                onClick={() => handleDecision(submission.user.id, "approve")}
              >
                Approve
              </button>
              <button
                className="button secondary"
                onClick={() => handleDecision(submission.user.id, "reject")}
              >
                Reject
              </button>
            </div>
          </section>
        ))
      )}
    </main>
  );
}
