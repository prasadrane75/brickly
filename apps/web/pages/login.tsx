import { FormEvent, useState } from "react";
import { useRouter } from "next/router";
import { apiFetch, setToken } from "../lib/api";

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
      const data = await apiFetch<{ token: string }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ emailOrPhone, password }),
      });
      setToken(data.token);
      setMessage("Logged in successfully.");
      await router.push("/properties");
    } catch (error: any) {
      setMessage(error.message || "Login failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main>
      <h1 className="section-title">Login</h1>
      <form onSubmit={handleSubmit} className="form">
        <div>
          <label className="label">Email or phone</label>
          <input
            className="input"
            value={emailOrPhone}
            onChange={(e) => setEmailOrPhone(e.target.value)}
          />
        </div>
        <div>
          <label className="label">Password</label>
          <input
            className="input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <button type="submit" className="button" disabled={loading}>
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>
      {message && <p className="status-error">{message}</p>}
    </main>
  );
}
