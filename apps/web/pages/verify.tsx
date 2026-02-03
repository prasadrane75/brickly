import { useEffect, useState } from "react";
import { useRouter } from "next/router";

export default function VerifyPage() {
  const router = useRouter();
  const [message, setMessage] = useState("Verifying your email...");
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");

  useEffect(() => {
    if (!router.isReady) return;
    const token = typeof router.query.token === "string" ? router.query.token : "";
    if (!token) {
      setMessage("Missing verification token.");
      setStatus("error");
      return;
    }
    fetch(`/api/auth/verify?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || "Verification failed.");
        }
        return res.json();
      })
      .then(() => {
        setMessage("Email verified. You can now log in.");
        setStatus("success");
      })
      .catch((err) => {
        setMessage(err.message || "Verification failed.");
        setStatus("error");
      });
  }, [router.isReady, router.query.token]);

  return (
    <main className="import-page">
      <section className="import-header">
        <h1>Email Verification</h1>
        <p>Confirming your email address.</p>
      </section>
      <div className="import-card">
        <p className={status === "error" ? "status-error" : "status-success"}>
          {message}
        </p>
      </div>
    </main>
  );
}
