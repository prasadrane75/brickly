import bcrypt from "bcrypt";
import { randomUUID } from "node:crypto";
import { Prisma, PrismaClient, UserRole } from "@prisma/client";

const prisma = new PrismaClient();

const demoUsers = [
  {
    email: "admin@fractional.app",
    role: UserRole.ADMIN,
    password: "demo-admin-123",
    phone: "+1-404-555-0101",
    kycStatus: "APPROVED",
  },
  {
    email: "lister@fractional.app",
    role: UserRole.LISTER,
    password: "demo-lister-123",
    phone: "+1-404-555-0102",
    kycStatus: "APPROVED",
  },
  {
    email: "maya@fractional.app",
    role: UserRole.INVESTOR,
    password: "demo-investor-123",
    phone: "+1-404-555-0103",
    kycStatus: "APPROVED",
  },
  {
    email: "noah@fractional.app",
    role: UserRole.INVESTOR,
    password: "demo-investor-456",
    phone: "+1-404-555-0104",
    kycStatus: "APPROVED",
  },
  {
    email: "olivia@fractional.app",
    role: UserRole.INVESTOR,
    password: "demo-investor-789",
    phone: "+1-404-555-0105",
    kycStatus: "APPROVED",
  },
] as const;

async function upsertUser(user: (typeof demoUsers)[number]) {
  const passwordHash = await bcrypt.hash(user.password, 12);
  const userId = randomUUID();

  await prisma.$executeRaw(
    Prisma.sql`
      INSERT INTO "User" ("id", "email", "phone", "passwordHash", "role", "emailVerified")
      VALUES (${userId}::uuid, ${user.email}, ${user.phone}, ${passwordHash}, ${user.role}::"UserRole", true)
      ON CONFLICT ("email") DO UPDATE
      SET
        "phone" = EXCLUDED."phone",
        "passwordHash" = EXCLUDED."passwordHash",
        "role" = EXCLUDED."role",
        "emailVerified" = EXCLUDED."emailVerified"
    `
  );

  const savedUsers = await prisma.$queryRaw<Array<{ id: string }>>(
    Prisma.sql`SELECT "id" FROM "User" WHERE "email" = ${user.email} LIMIT 1`
  );
  const savedUser = savedUsers[0];

  if (!savedUser) {
    throw new Error(`Failed to load synced user for ${user.email}`);
  }

  const kycId = randomUUID();
  const submittedAt = new Date();

  await prisma.$executeRaw(
    Prisma.sql`
      INSERT INTO "KycProfile" ("id", "userId", "status", "data", "submittedAt")
      VALUES (
        ${kycId}::uuid,
        ${savedUser.id}::uuid,
        ${user.kycStatus}::"KycStatus",
        ${JSON.stringify({ source: "sync-demo-users" })}::jsonb,
        ${submittedAt}
      )
      ON CONFLICT ("userId") DO UPDATE
      SET
        "status" = EXCLUDED."status",
        "data" = EXCLUDED."data",
        "submittedAt" = EXCLUDED."submittedAt"
    `
  );

  return savedUser;
}

async function main() {
  await prisma.$connect();

  for (const user of demoUsers) {
    await upsertUser(user);
  }

  console.log(`Synced ${demoUsers.length} demo users.`);
  for (const user of demoUsers) {
    console.log(`- ${user.email}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
