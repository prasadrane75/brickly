import { PrismaClient } from "@prisma/client";
import { seedMLSListings } from "../src/import/import.seed.js";

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "postgres://app:app@localhost:5433/fractional";
}

const prisma = new PrismaClient();

async function main() {
  await prisma.$connect();

  const count = await seedMLSListings(prisma);
  console.log(`Seeded ${count} MLS listings.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
