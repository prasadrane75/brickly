import type { AppProps } from "next/app";
import { useEffect, useState } from "react";
import { apiFetch, clearToken, getToken, getTokenPayload } from "../lib/api";
import { AppShell } from "../components/layout/AppShell";
import type { PaginatedResponse } from "../shared/api-types";
import "../styles/globals.css";
import "../styles/import.css";
import "../styles/liquidity.css";

export default function App({ Component, pageProps }: AppProps) {
  const [hasToken, setHasToken] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  const [unreadAlerts, setUnreadAlerts] = useState<number>(0);

  useEffect(() => {
    function refresh() {
      const token = getToken();
      setHasToken(Boolean(token));
      setRole(getTokenPayload()?.role ?? null);
    }
    refresh();
    window.addEventListener("storage", refresh);
    window.addEventListener("auth-changed", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("auth-changed", refresh);
    };
  }, []);

  useEffect(() => {
    if (!hasToken) {
      setUnreadAlerts(0);
      return;
    }

    apiFetch<PaginatedResponse<{ readAt?: string | null }>>("/v1/notifications?page=1&pageSize=20")
      .then((items) => {
        const unread = items.data.filter((item) => !item.readAt).length;
        setUnreadAlerts(unread);
      })
      .catch(() => setUnreadAlerts(0));
  }, [hasToken]);

  function handleLogout() {
    clearToken();
    setHasToken(false);
    if (typeof window !== "undefined") {
      window.location.replace("/login");
    }
  }

  return (
    <AppShell
      hasToken={hasToken}
      role={role}
      unreadAlerts={unreadAlerts}
      onLogout={handleLogout}
    >
        <Component {...pageProps} />
    </AppShell>
  );
}
