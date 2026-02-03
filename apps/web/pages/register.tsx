import { FormEvent, useState } from "react";
import { useRouter } from "next/router";
import { apiFetch } from "../lib/api";

const roles = ["INVESTOR", "LISTER", "TENANT"] as const;

type Role = (typeof roles)[number];

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("INVESTOR");
  const [message, setMessage] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    setStatus("idle");

    const payload = {
      email,
      password,
      role,
    };

    try {
      await apiFetch<{ message: string }>("/auth/register", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setMessage("Account created. Check your email to verify.");
      setStatus("success");
    } catch (error: any) {
      setMessage(error.message || "Registration failed.");
      setStatus("error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="import-page">
      <section className="import-header">
        <h1>Create account</h1>
        <p>Set up your profile to start investing or listing properties.</p>
      </section>
      <div className="import-card">
        <form onSubmit={handleSubmit} className="form">
          <div>
            <label className="label">Email</label>
            <input
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="label">Password</label>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="label">Role</label>
            <select
              className="select"
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
            >
              {roles.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className="import-primary" disabled={loading}>
            {loading ? "Creating..." : "Create account"}
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
