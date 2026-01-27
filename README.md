# fractional-property-app

## Prerequisites
- Node.js 18+ and npm
- Docker (for Postgres)

## Setup
1) Install dependencies from the repo root:
   ```bash
   npm install
   ```

2) Start Postgres:
   ```bash
   npm run db:up
   ```

3) In a new terminal, run migrations:
   ```bash
   DATABASE_URL=postgres://app:app@localhost:5433/fractional npx prisma migrate dev --schema apps/api/prisma/schema.prisma --name init --skip-seed
   ```

4) Seed the database (sample users + properties):
   ```bash
   DATABASE_URL=postgres://app:app@localhost:5433/fractional npm --workspace apps/api run prisma:seed
   ```

## Run the apps
From the repo root:
```bash
npm run dev
```

- API: http://localhost:4000
- Web: http://localhost:3000 (or 3001/3002 if busy)

## Stop Postgres
```bash
npm run db:down
```

---

## Quick start for a new machine
```bash
npm install
npm run db:up
DATABASE_URL=postgres://app:app@localhost:5433/fractional npx prisma migrate dev --schema apps/api/prisma/schema.prisma --name init --skip-seed
DATABASE_URL=postgres://app:app@localhost:5433/fractional npm --workspace apps/api run prisma:seed
npm run dev
```

---

## Notes
- Ensure Docker Desktop is running before `npm run db:up`.
- Copy `apps/web/.env.local.example` to `apps/web/.env.local` if you want a custom API URL.

---

## Docker Hub quick start (prebuilt images)
1) Create a production-style stack:
   ```bash
   docker compose -f docker-compose.prod.yml up -d
   ```

2) Run migrations + seed (once):
   ```bash
   docker exec -it brickly-api npx prisma migrate dev --schema apps/api/prisma/schema.prisma --name init --skip-seed
   docker exec -it brickly-api npx prisma db seed --schema apps/api/prisma/schema.prisma
   ```

3) Open:
   - Web: http://localhost:3000
   - API: http://localhost:4000

   ```bash
   npm run db:migrate
   ```

4) Seed the database:
   ```bash
   npm run prisma:seed
   ```

5) (Optional) Reset the database:
   ```bash
   npm run db:reset
   ```

## Run the apps
From the repo root:
```bash
npm run dev
```

- API: http://localhost:4000
- Web: http://localhost:3000

## Stop Postgres
```bash
npm run db:down
```
