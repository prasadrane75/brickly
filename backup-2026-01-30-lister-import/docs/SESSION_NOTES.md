# Session Notes

## Summary
- Docker images built and pushed for api/web/db (multi-arch amd64/arm64).
- Web assets fixed in Docker image (public/ copied).
- Cloud Run deployed for api and web; custom domains mapped:
  - https://api.bricklyusa.com
  - https://app.bricklyusa.com
- Supabase Postgres configured and seeded with 100 + 200 properties.
- Admin delete endpoint added for LISTED properties.
- Web UI updates: logo, backsplash patterns, home hero background.

## Key Images
- guidprncons/brickly-api:latest
- guidprncons/brickly-web:latest
- guidprncons/brickly-web:demo (baked NEXT_PUBLIC_API_BASE_URL=https://api.bricklyusa.com)
- guidprncons/brickly-db:latest (migrations + seed on first init)

## Cloud Run
Redeploy API:
```bash
gcloud run deploy brickly-api \
  --image docker.io/guidprncons/brickly-api:latest \
  --region us-east1 \
  --allow-unauthenticated \
  --set-env-vars DATABASE_URL="SUPABASE_URL",JWT_SECRET="JWT_SECRET",CORS_ORIGINS="https://app.bricklyusa.com"
```

Redeploy Web:
```bash
gcloud run deploy brickly-web \
  --image docker.io/guidprncons/brickly-web:demo \
  --region us-east1 \
  --allow-unauthenticated
```

## Supabase
Seed script:
```bash
SEED_COUNT=200 DATABASE_URL="SUPABASE_URL?sslmode=require" \
  npx tsx apps/api/prisma/seed-properties.ts
```

Counts:
```bash
psql "SUPABASE_URL?sslmode=require" -c 'SELECT COUNT(*) FROM "Property";'
psql "SUPABASE_URL?sslmode=require" -c 'SELECT "state", COUNT(*) FROM "Property" GROUP BY "state" ORDER BY COUNT(*) DESC;'
```

## Local Dev
```bash
npm run db:up
DATABASE_URL=postgres://app:app@localhost:5433/fractional \
  npx prisma migrate deploy --schema apps/api/prisma/schema.prisma
DATABASE_URL=postgres://app:app@localhost:5433/fractional \
  npm --workspace apps/api run prisma:seed
npm --workspace apps/api run dev
npm --workspace apps/web run dev
```
