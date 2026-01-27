import type { AppProps } from "next/app";
import Link from "next/link";
import { useEffect, useState } from "react";
import { clearToken, getToken, getTokenPayload } from "../lib/api";
import "../styles/globals.css";

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
          <span>Brickly</span>
        </Link>
        <div className="nav-links">
          <Link href="/properties">Properties</Link>
          {role === "LISTER" && <Link href="/listings">My Listings</Link>}
          {role === "LISTER" && <Link href="/listings/new">New Listing</Link>}
          {role !== "ADMIN" && <Link href="/portfolio">Portfolio</Link>}
          {role === "TENANT" && <Link href="/rentals">Rentals</Link>}
          {role === "ADMIN" ? (
            <>
              <Link href="/admin/kyc">KYC Review</Link>
              <Link href="/admin/rentals">Rentals Admin</Link>
              <Link href="/admin/rental-applications">Rental Applications</Link>
            </>
          ) : (
            hasToken && <Link href="/kyc">KYC</Link>
          )}
          <Link href="/market">Market</Link>
        </div>
        {hasToken ? (
          <div className="nav-right">
            <span className="muted">Role: {role ?? "Unknown"}</span>
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
