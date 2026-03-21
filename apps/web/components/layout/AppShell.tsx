import Link from "next/link";
import { ReactNode } from "react";

type AppShellProps = {
  children: ReactNode;
  hasToken: boolean;
  role: string | null;
  unreadAlerts: number;
  onLogout: () => void;
};

// Extension point: shared investor-demo shell. Future module nav sections,
// role-specific layouts, and design system components should converge here.
export function AppShell({
  children,
  hasToken,
  role,
  unreadAlerts,
  onLogout,
}: AppShellProps) {
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
            <Link href="/orders" className="nav-link">
              Orders
            </Link>
          )}
          {hasToken && role !== "TENANT" && (
            <Link href="/transactions" className="nav-link">
              Transactions
            </Link>
          )}
          {hasToken && (
            <Link href="/documents" className="nav-link">
              Documents
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
              <Link href="/admin/audit-logs" className="nav-link">
                Audit Logs
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
              <Link href="/admin/platform-architecture" className="nav-link">
                Platform
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
            <button className="button secondary" onClick={onLogout}>
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
      <main className="main">{children}</main>
    </div>
  );
}
