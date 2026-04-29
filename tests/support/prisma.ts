import { PrismaClient } from "../../apps/api/src/db/prisma-client.js";
import { testConfig } from "./config.js";

export const prisma = new PrismaClient({
  datasourceUrl: testConfig.databaseUrl,
});

