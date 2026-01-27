# Brickly

## Local development (API + Web + Postgres)
Prereqs:
- Node.js 18+
- Docker Desktop

From the repo root:
```bash
npm install
npm run db:up
DATABASE_URL=postgres://app:app@localhost:5433/fractional npx prisma migrate deploy --schema apps/api/prisma/schema.prisma
DATABASE_URL=postgres://app:app@localhost:5433/fractional npm --workspace apps/api run prisma:seed
npm run dev
```

Open:
- API: http://localhost:4000
- Web: http://localhost:3000

Stop Postgres:
```bash
npm run db:down
```

## Docker Hub quick start (prebuilt images)
This uses the prebuilt multi-arch images and a seeded DB image.

```bash
docker compose -f docker-compose.prod.yml up -d
```

Open:
- Web: http://localhost:3000
- API: http://localhost:4000

Notes:
- The DB image runs migrations + seed on first container init only.
- To re-seed, remove the DB volume and start again.
