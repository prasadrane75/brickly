import type { AppProps } from "next/app";
import Link from "next/link";
import { useEffect, useState } from "react";
import { clearToken, getToken, getTokenPayload } from "../lib/api";
import "../styles/globals.css";
import "../styles/import.css";

export default function App({ Component, pageProps }: AppProps) {
  const [hasToken, setHasToken] = useState(false);
  const [role, setRole] = useState<string | null>(null);

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

  function handleLogout() {
    clearToken();
    setHasToken(false);
  }

  return (
    <div className="container">
      <nav className="nav">
        <Link href="/" className="logo">
          <img src="/brickylogo.png" alt="Brickly" />
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
          {role === "INVESTOR" && (
            <Link href="/market" className="nav-link">
              Market
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
              Alerts <span className="nav-badge">3</span>
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
