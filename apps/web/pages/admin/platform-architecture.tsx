import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../lib/api";
import { webModuleManifest } from "../../modules/module-manifest";

type PlatformOverview = {
  name: string;
  phase: string;
  modules: string[];
  placeholders: {
    ai: string;
    blockchain: string;
  };
};

const backendRouteGroups = [
  {
    title: "Auth",
    routes: ["/auth", "/kyc"],
    description: "Authentication, verification, and identity gates.",
  },
  {
    title: "Properties / Assets",
    routes: ["/properties", "/listings", "/rentals", "/import"],
    description: "Core asset listing, property intake, and rental inventory.",
  },
  {
    title: "Portfolio",
    routes: ["/portfolio", "/invest"],
    description: "Investor holdings and buy flow surfaces.",
  },
  {
    title: "Transactions / Orders",
    routes: ["/market"],
    description: "Sell orders, buy orders, liquidity, and matching.",
  },
  {
    title: "Admin",
    routes: ["/admin"],
    description: "Admin operations, governance, and operational controls.",
  },
  {
    title: "Notifications",
    routes: ["/notifications"],
    description: "User alert delivery and read-state handling.",
  },
];

export default function PlatformArchitecturePage() {
  const [overview, setOverview] = useState<PlatformOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<PlatformOverview>("/")
      .then((response) => {
        setOverview(response);
        setError(null);
      })
      .catch((err: Error) => {
        setError(err.message || "Failed to load platform overview.");
      })
      .finally(() => setLoading(false));
  }, []);

  const frontendModules = useMemo(
    () =>
      webModuleManifest.map((module) => ({
        ...module,
        pageCount: module.pageRoots.length,
      })),
    []
  );

  return (
    <main className="architecture-page">
      <section className="architecture-hero">
        <div>
          <p className="architecture-eyebrow">Platform Architecture</p>
          <h1 className="section-title">Phase 1 Foundation</h1>
          <p className="architecture-summary">
            This admin page surfaces the implemented platform model now in place
            for the investor demo: deterministic operational workflows in
            Postgres, AI as an explanation layer, and blockchain as a proof
            layer that never blocks the core app.
          </p>
        </div>
        <div className="architecture-hero-metrics">
          <div className="architecture-metric-card">
            <span className="architecture-metric-label">Backend Phase</span>
            <strong>{overview?.phase || "Loading..."}</strong>
          </div>
          <div className="architecture-metric-card">
            <span className="architecture-metric-label">Frontend Modules</span>
            <strong>{frontendModules.length}</strong>
          </div>
          <div className="architecture-metric-card">
            <span className="architecture-metric-label">Placeholder Services</span>
            <strong>AI + Blockchain</strong>
          </div>
        </div>
      </section>

      {error && <p className="status-error">{error}</p>}

      <section className="grid architecture-kpi-grid">
        <div className="card architecture-callout">
          <p className="architecture-callout-label">API status</p>
          <h2>{loading ? "Checking..." : overview?.name || "Unavailable"}</h2>
          <p className="muted">
            The API root now exposes Phase 1 platform metadata so the admin UI
            can verify the active architecture contract.
          </p>
          <div className="architecture-pill-row">
            {(overview?.modules || []).map((module) => (
              <span key={module} className="architecture-pill">
                {module}
              </span>
            ))}
          </div>
        </div>

        <div className="card architecture-callout">
          <p className="architecture-callout-label">Future layers</p>
          <h2>Active Extension Layers</h2>
          <div className="architecture-placeholder-list">
            <div className="architecture-placeholder">
              <span className="architecture-placeholder-title">AI Service</span>
              <span className="architecture-placeholder-state">
                {overview?.placeholders.ai || "placeholder"}
              </span>
              <p className="muted">
                AI is live as an additive interpretation layer. Portfolio,
                document, transaction, and sell-price rationale flows degrade
                safely to deterministic behavior when the provider is
                unavailable.
              </p>
            </div>
            <div className="architecture-placeholder">
              <span className="architecture-placeholder-title">
                Blockchain Service
              </span>
              <span className="architecture-placeholder-state">
                {overview?.placeholders.blockchain || "placeholder"}
              </span>
              <p className="muted">
                Blockchain is live as a verification layer for ownership and
                transfer proofs. Operational trades and holdings still run from
                Prisma and remain available even if blockchain is down.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid architecture-kpi-grid">
        <div className="card architecture-callout">
          <p className="architecture-callout-label">Pricing Model</p>
          <h2>Deterministic Recommendation First</h2>
          <p className="muted">
            Sell pricing is computed from reference price, liquidity score,
            strategy multipliers, and market rules. The API owns the number; the
            UI simply renders it.
          </p>
          <div className="architecture-pill-row">
            <span className="architecture-pill">reference price</span>
            <span className="architecture-pill">liquidity score</span>
            <span className="architecture-pill">strategy</span>
            <span className="architecture-pill">market rules</span>
          </div>
        </div>

        <div className="card architecture-callout">
          <p className="architecture-callout-label">AI Pricing Role</p>
          <h2>Explanation, Not Authority</h2>
          <p className="muted">
            AI can explain why a sell recommendation looks aggressive,
            balanced, or conservative, but it does not control the underlying
            recommended price or block order placement.
          </p>
          <div className="architecture-pill-row">
            <span className="architecture-pill">optional rationale</span>
            <span className="architecture-pill">safe fallback</span>
            <span className="architecture-pill">non-blocking</span>
          </div>
        </div>
      </section>

      <section className="targeting-layout architecture-section">
        <div className="card">
          <div className="section-row">
            <div>
              <h2 className="section-title">Frontend Module Surface</h2>
              <p className="muted">
                Current page ownership and the future destination folders for
                each module area.
              </p>
            </div>
          </div>
          <div className="architecture-module-list">
            {frontendModules.map((module) => (
              <article key={module.name} className="architecture-module-card">
                <div className="architecture-module-header">
                  <div>
                    <h3>{module.name}</h3>
                    <p className="muted">
                      {module.pageCount} current route
                      {module.pageCount === 1 ? "" : "s"}
                    </p>
                  </div>
                  <span className="architecture-chip">frontend</span>
                </div>
                <div className="architecture-meta-block">
                  <strong>Routes</strong>
                  <div className="architecture-pill-row">
                    {module.pageRoots.length > 0 ? (
                      module.pageRoots.map((root) => (
                        <span key={root} className="architecture-pill subtle">
                          {root}
                        </span>
                      ))
                    ) : (
                      <span className="architecture-pill subtle">reserved</span>
                    )}
                  </div>
                </div>
                <div className="architecture-meta-block">
                  <strong>Future homes</strong>
                  <ul className="architecture-list">
                    {module.futureHomes.map((home) => (
                      <li key={home}>{home}</li>
                    ))}
                  </ul>
                </div>
              </article>
            ))}
          </div>
        </div>

        <aside className="card targeting-help">
          <h2 className="section-title">Backend Route Domains</h2>
          <p className="muted">
            The API is still composed in a single entry point for stability, but
            these route clusters now map to the module plan.
          </p>
          <div className="architecture-route-groups">
            {backendRouteGroups.map((group) => (
              <div key={group.title} className="architecture-route-group">
                <div className="architecture-module-header">
                  <strong>{group.title}</strong>
                  <span className="architecture-chip backend">backend</span>
                </div>
                <p className="muted">{group.description}</p>
                <div className="architecture-pill-row">
                  {group.routes.map((route) => (
                    <span key={route} className="architecture-pill">
                      {route}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </aside>
      </section>
    </main>
  );
}
