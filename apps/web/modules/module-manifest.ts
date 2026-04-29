export type WebModule = {
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
  pageRoots: string[];
  futureHomes: string[];
};

export const webModuleManifest: WebModule[] = [
  {
    name: "auth",
    pageRoots: ["/login", "/register", "/verify", "/kyc"],
    futureHomes: ["modules/auth", "components/auth", "services/auth"],
  },
  {
    name: "properties",
    pageRoots: ["/properties", "/listings", "/rentals", "/lister"],
    futureHomes: ["modules/properties", "components/properties"],
  },
  {
    name: "portfolio",
    pageRoots: ["/portfolio"],
    futureHomes: ["modules/portfolio"],
  },
  {
    name: "transactions",
    pageRoots: ["/market", "/market-orders", "/buy-orders"],
    futureHomes: ["modules/transactions"],
  },
  {
    name: "admin",
    pageRoots: ["/admin"],
    futureHomes: ["modules/admin"],
  },
  {
    name: "uploads",
    pageRoots: [],
    futureHomes: ["modules/uploads"],
  },
  {
    name: "notifications",
    pageRoots: ["/alerts"],
    futureHomes: ["modules/notifications"],
  },
  {
    name: "analytics",
    pageRoots: [],
    futureHomes: ["modules/analytics"],
  },
  {
    name: "ai",
    pageRoots: [],
    futureHomes: ["services/ai", "modules/ai"],
  },
  {
    name: "blockchain",
    pageRoots: [],
    futureHomes: ["services/blockchain", "modules/blockchain"],
  },
];
