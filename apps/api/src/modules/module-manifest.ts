export type AppModule = {
  name:
    | "auth"
    | "properties"
    | "portfolio"
    | "transactions"
    | "admin"
    | "uploads"
    | "notifications"
    | "analytics"
    | "ai"
    | "blockchain";
  routePrefixes: string[];
  currentEntryPoints: string[];
  plannedLayers: string[];
};

// Phase 1 intentionally keeps some routes in src/index.ts for safety while the
// surrounding layers are extracted. Use this manifest as the target map for
// future route decomposition rather than expanding the monolith further.
export const moduleManifest: AppModule[] = [
  {
    name: "auth",
    routePrefixes: ["/auth", "/kyc"],
    currentEntryPoints: ["src/index.ts", "src/middleware/auth.ts"],
    plannedLayers: ["modules/auth/routes", "modules/auth/service", "repositories/user"],
  },
  {
    name: "properties",
    routePrefixes: ["/properties", "/listings", "/rentals", "/import"],
    currentEntryPoints: ["src/index.ts", "src/import/import.routes.ts"],
    plannedLayers: [
      "modules/properties/routes",
      "modules/properties/service",
      "repositories/property",
    ],
  },
  {
    name: "portfolio",
    routePrefixes: ["/portfolio", "/invest"],
    currentEntryPoints: ["src/index.ts"],
    plannedLayers: ["modules/portfolio/routes", "modules/portfolio/service"],
  },
  {
    name: "transactions",
    routePrefixes: ["/market"],
    currentEntryPoints: ["src/index.ts", "src/market", "src/pricing", "src/targeting"],
    plannedLayers: ["modules/transactions/routes", "modules/transactions/service"],
  },
  {
    name: "admin",
    routePrefixes: ["/admin"],
    currentEntryPoints: ["src/index.ts"],
    plannedLayers: ["modules/admin/routes", "modules/admin/service"],
  },
  {
    name: "uploads",
    routePrefixes: ["/uploads"],
    currentEntryPoints: [],
    plannedLayers: ["modules/uploads/routes", "modules/uploads/service"],
  },
  {
    name: "notifications",
    routePrefixes: ["/notifications"],
    currentEntryPoints: ["src/index.ts"],
    plannedLayers: ["modules/notifications/routes", "modules/notifications/service"],
  },
  {
    name: "analytics",
    routePrefixes: [],
    currentEntryPoints: ["src/services/analytics/index.ts"],
    plannedLayers: ["services/analytics", "modules/admin/analytics"],
  },
  {
    name: "ai",
    routePrefixes: [],
    currentEntryPoints: ["src/services/ai/index.ts"],
    plannedLayers: ["services/ai", "modules/ai"],
  },
  {
    name: "blockchain",
    routePrefixes: [],
    currentEntryPoints: ["src/services/blockchain/index.ts"],
    plannedLayers: ["services/blockchain", "modules/blockchain"],
  },
];
