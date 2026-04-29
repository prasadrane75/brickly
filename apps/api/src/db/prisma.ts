import { PrismaClient } from "./prisma-client.js";

// Extension point: add Prisma middleware, observability, or multi-tenant
// connection management here as Phase 1 grows into analytics and ledger flows.
export const prisma = new PrismaClient();
