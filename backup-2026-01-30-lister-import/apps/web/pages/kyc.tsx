import { FormEvent, useEffect, useState } from "react";
import { apiFetch } from "../lib/api";

type KycProfile = {
  status: "PENDING" | "APPROVED" | "REJECTED";
  data: Record<string, unknown>;
  submittedAt: string;
};

export default function KycPage() {
  const [profile, setProfile] = useState<KycProfile | null>(null);
  const [fullName, setFullName] = useState("");
  const [country, setCountry] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");

  useEffect(() => {
    apiFetch<KycProfile>("/kyc/me")
      .then(setProfile)
      .catch(() => {
        setProfile(null);
      });
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setMessage(null);
    setStatus("idle");

    try {
      const data = await apiFetch<KycProfile>("/kyc/submit", {
        method: "POST",
        body: JSON.stringify({ data: { fullName, country } }),
      });
      setProfile(data);
      setMessage("KYC submitted.");
      setStatus("success");
    } catch (error: any) {
      setMessage(error.message || "Failed to submit KYC.");
      setStatus("error");
    }
  }

  return (
    <main className="import-page">
      <section className="import-header">
        <h1>KYC Verification</h1>
        <p>Submit your details to unlock listing and investment features.</p>
      </section>
      <div className="import-card">
        {profile && (
          <p>
            Current status: <strong>{profile.status}</strong>
          </p>
        )}
        <form onSubmit={handleSubmit} className="form">
          <div>
            <label className="label">Full name</label>
            <input
              className="input"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="label">Country</label>
            <input
              className="input"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="import-primary">
            Submit KYC
          </button>
        </form>
      </div>
      {message && (
        <p className={status === "error" ? "status-error" : "status-success"}>
          {message}
        </p>
      )}
    </main>
  );
}
