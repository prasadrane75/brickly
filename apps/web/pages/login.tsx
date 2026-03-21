import { FormEvent, useState } from "react";
import { useRouter } from "next/router";
import { apiFetch, setToken } from "../lib/api";
import { FutureBadge } from "../components/ui/FutureBadge";

const demoCredentials = [
  {
    label: "Admin",
    email: "admin@fractional.app",
    password: "demo-admin-123",
  },
  {
    label: "Investor",
    email: "maya@fractional.app",
    password: "demo-investor-123",
  },
  {
    label: "Secondary Investor",
    email: "noah@fractional.app",
    password: "demo-investor-456",
  },
];

export default function LoginPage() {
  const router = useRouter();
  const [emailOrPhone, setEmailOrPhone] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (!emailOrPhone.trim()) {
        throw new Error("Enter an email or phone number.");
      }
      if (!password.trim()) {
        throw new Error("Enter a password.");
      }

      const data = await apiFetch<{ token: string }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({
          emailOrPhone: emailOrPhone.trim(),
          password,
        }),
      });

      setToken(data.token);
      await router.push("/");
    } catch (error: any) {
      setMessage(error.message || "Login failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="screen-page">
      <section className="login-shell">
        <div className="login-panel login-panel-dark">
          <p className="screen-eyebrow">Investor Demo Access</p>
          <h1>Login to the Brickly Phase 1 platform.</h1>
          <p className="login-lead">
            Demo the operational investing core: portfolio visibility,
            properties, orders, documents, notifications, and admin oversight.
          </p>

          <div className="login-badge-row">
            <FutureBadge label="AI Insights" phase="PHASE_2_AI" />
            <FutureBadge label="Verified Ownership" phase="PHASE_3_BLOCKCHAIN" />
          </div>

          <div className="login-feature-grid">
            <div className="login-feature-card">
              <strong>Investor dashboard</strong>
              <p>Portfolio value, yield estimates, allocation, and activity.</p>
            </div>
            <div className="login-feature-card">
              <strong>Operational diligence</strong>
              <p>Documents, transactions, notifications, and auditability.</p>
            </div>
            <div className="login-feature-card">
              <strong>Future-ready structure</strong>
              <p>Reserved extension points for AI and ownership verification.</p>
            </div>
          </div>
        </div>

        <div className="login-panel screen-form-card">
          <div className="login-form-header">
            <p className="section-eyebrow">Secure Access</p>
            <h2 className="section-title">Sign in</h2>
            <p className="section-subtitle">
              Use one of the seeded demo accounts below or enter your own local
              credentials.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="form login-form">
            <div>
              <label className="label">Email or phone</label>
              <input
                className="input"
                value={emailOrPhone}
                onChange={(e) => setEmailOrPhone(e.target.value)}
                placeholder="admin@fractional.app"
              />
            </div>
            <div>
              <label className="label">Password</label>
              <input
                className="input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="demo-admin-123"
              />
            </div>
            <button type="submit" className="button" disabled={loading}>
              {loading ? "Signing in..." : "Enter Dashboard"}
            </button>
          </form>

          {message ? <p className="status-error">{message}</p> : null}

          <div className="login-credentials-card">
            <div className="section-row login-credentials-header">
              <div>
                <p className="section-eyebrow">Demo Accounts</p>
                <h3>Seeded credentials</h3>
              </div>
              <span className="badge subtle">Phase 1</span>
            </div>
            <div className="login-credentials-list">
              {demoCredentials.map((credential) => (
                <button
                  key={credential.email}
                  type="button"
                  className="login-credential-item"
                  onClick={() => {
                    setEmailOrPhone(credential.email);
                    setPassword(credential.password);
                  }}
                >
                  <span>
                    <strong>{credential.label}</strong>
                    <small>{credential.email}</small>
                  </span>
                  <code>{credential.password}</code>
                </button>
              ))}
            </div>
          </div>

          {/* PHASE_2_AI: personalized login insights and guidance should be attached after auth succeeds. */}
          {/* PHASE_3_BLOCKCHAIN: verified identity and ownership attestations can surface in the sign-in journey later. */}
        </div>
      </section>
    </main>
  );
}
