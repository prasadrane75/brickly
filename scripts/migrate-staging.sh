#!/usr/bin/env bash
set -euo pipefail

export DATABASE_URL=${DATABASE_URL:-"postgresql://postgres:I2EFI33x2TK4kW7K@db.ylkkjnppcuqluodoanyl.supabase.co:5432/postgres?sslmode=require&schema=app"}

echo "Applying migrations to staging database..."
npx prisma migrate deploy --schema apps/api/prisma/schema.prisma

echo "Done."
