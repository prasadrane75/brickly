import type { AppProps } from "next/app";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { apiFetch, clearToken, getToken, getTokenPayload } from "../lib/api";
import "../styles/globals.css";
import "../styles/import.css";
import "../styles/liquidity.css";

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
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

    apiFetch<{ readAt?: string | null }[]>("/notifications")
      .then((items) => {
        const unread = items.filter((item) => !item.readAt).length;
        setUnreadAlerts(unread);
      })
      .catch(() => setUnreadAlerts(0));
  }, [hasToken]);

  function handleLogout() {
    clearToken();
    setHasToken(false);
    router.replace("/login");
  }

  return (
    <div className="container">
      <nav className="nav">
        <Link href="/" className="logo">
          <img src="/bricklyusa-logo.svg" alt="bricklyusa" />
        </Link>
        <div className="nav-links">
          {role !== "TENANT" && (
            <Link href="/properties" className="nav-link">
              Properties
            </Link>
          )}
          {role !== "TENANT" && (
            <Link href="/portfolio" className="nav-link">
              Portfolio
            </Link>
          )}
          {hasToken && role !== "TENANT" && (
            <Link href="/market-orders" className="nav-link">
              Market Orders
            </Link>
          )}
          {role === "TENANT" && (
            <Link href="/rentals" className="nav-link">
              Rentals
            </Link>
          )}
          {role === "ADMIN" && (
            <>
              <Link href="/admin/kyc" className="nav-link">
                KYC Review
              </Link>
              <Link href="/admin/rentals" className="nav-link">
                Rentals Admin
              </Link>
              <Link href="/admin/rental-applications" className="nav-link">
                Rental Applications
              </Link>
              <Link href="/admin/users" className="nav-link">
                Users
              </Link>
              <Link href="/admin/mls-listings" className="nav-link">
                MLS Listings
              </Link>
              <Link href="/admin/listers" className="nav-link">
                Listers
              </Link>
              <Link href="/admin/targeting" className="nav-link">
                Targeting
              </Link>
              <Link href="/admin/market-rules" className="nav-link">
                Market Rules
              </Link>
              <Link href="/admin/liquidity" className="nav-link">
                Liquidity
              </Link>
            </>
          )}
          {hasToken && role !== "ADMIN" && (
            <Link href="/kyc" className="nav-link">
              KYC
            </Link>
          )}
          {role === "LISTER" && (
            <>
              <Link href="/listings" className="nav-link">
                My Listings
              </Link>
              <Link href="/listings/new" className="nav-link">
                New Listing
              </Link>
              <Link href="/lister/properties" className="nav-link">
                Lister Properties
              </Link>
            </>
          )}
        </div>
        {hasToken ? (
          <div className="nav-right-stack">
            <span className="muted">Role: {role ?? "Unknown"}</span>
            <Link href="/alerts" className="nav-link">
              Alerts{" "}
              {unreadAlerts > 0 && (
                <span className="nav-badge">{unreadAlerts}</span>
              )}
            </Link>
            <button className="button secondary" onClick={handleLogout}>
              Logout
            </button>
          </div>
        ) : (
          <div className="nav-right">
            <Link href="/login">Login</Link>
            <Link href="/register">Register</Link>
          </div>
        )}
      </nav>
      <main className="main">
        <Component {...pageProps} />
      </main>
    </div>
  );
}
