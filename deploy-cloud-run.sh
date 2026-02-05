#!/usr/bin/env bash
set -euo pipefail

PROJECT="bricklyusa"
REGION="us-east1"
REPO="guidprncons"
TAG="prod-20260130"

DB_URL='postgresql://postgres:fBoBZGcngKkooZOx@db.gbsrdcpmfchhgmhhnyad.supabase.co:5432/postgres?sslmode=require'
JWT_SECRET="CNrhDjt/ZvpI5ADaFtK0xE93HTFZsfpBkC/Z75mYDPF1e6vobbOZ3lZiXNmYyXL3"

API_IMAGE="us-east1-docker.pkg.dev/${PROJECT}/${REPO}/brickly-api:${TAG}"
WEB_IMAGE="us-east1-docker.pkg.dev/${PROJECT}/${REPO}/brickly-web:${TAG}"
DB_IMAGE="us-east1-docker.pkg.dev/${PROJECT}/${REPO}/brickly-db:${TAG}"

echo "==> Auth + project"
gcloud auth login
gcloud config set project "${PROJECT}"
gcloud auth configure-docker "${REGION}-docker.pkg.dev"

echo "==> Ensure Artifact Registry repo exists"
gcloud artifacts repositories create "${REPO}" \
  --repository-format=docker \
  --location="${REGION}" \
  --description="Brickly images" || true

echo "==> Build + push API"
docker buildx build --platform linux/amd64,linux/arm64 \
  -t "${API_IMAGE}" \
  -t "us-east1-docker.pkg.dev/${PROJECT}/${REPO}/brickly-api:latest" \
  -f apps/api/Dockerfile --push .

echo "==> Deploy API"
API_URL=$(gcloud run deploy api \
  --image "${API_IMAGE}" \
  --region "${REGION}" \
  --set-env-vars DATABASE_URL="${DB_URL}",JWT_SECRET="${JWT_SECRET}" \
  --allow-unauthenticated \
  --format="value(status.url)")
echo "API_URL=${API_URL}"

echo "==> Build + push Web"
docker buildx build --platform linux/amd64,linux/arm64 \
  --build-arg NEXT_PUBLIC_API_BASE_URL="${API_URL}" \
  -t "${WEB_IMAGE}" \
  -t "us-east1-docker.pkg.dev/${PROJECT}/${REPO}/brickly-web:latest" \
  -f apps/web/Dockerfile --push .

echo "==> (Optional) Build + push DB"
docker buildx build --platform linux/amd64,linux/arm64 \
  -t "${DB_IMAGE}" \
  -t "us-east1-docker.pkg.dev/${PROJECT}/${REPO}/brickly-db:latest" \
  -f db/Dockerfile --push db

echo "==> Deploy Web"
WEB_URL=$(gcloud run deploy web \
  --image "${WEB_IMAGE}" \
  --region "${REGION}" \
  --set-env-vars IN_DOCKER=true,NEXT_PUBLIC_API_BASE_URL="${API_URL}" \
  --allow-unauthenticated \
  --format="value(status.url)")
echo "WEB_URL=${WEB_URL}"

echo "==> Run migrations"
DATABASE_URL="${DB_URL}" npx prisma migrate deploy --schema apps/api/prisma/schema.prisma

echo "==> Seed MLS listings"
DATABASE_URL="${DB_URL}" npx tsx apps/api/prisma/seed-mls-listings.ts

echo "==> Done"
echo "API: ${API_URL}"
echo "WEB: ${WEB_URL}"
