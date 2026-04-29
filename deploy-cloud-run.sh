#!/usr/bin/env bash
set -euo pipefail

PROJECT="${PROJECT:-bricklyusa}"
REGION="${REGION:-us-east1}"
REPO="${REPO:-guidprncons}"
TAG="${TAG:-prod-$(date +%Y%m%d-%H%M%S)}"

API_SERVICE="${API_SERVICE:-api}"
WEB_SERVICE="${WEB_SERVICE:-web}"

DB_URL="${DATABASE_URL:-postgresql://postgres:fBoBZGcngKkooZOx@db.gbsrdcpmfchhgmhhnyad.supabase.co:5432/postgres?sslmode=require}"
JWT_SECRET_VALUE="${JWT_SECRET:-CNrhDjt/ZvpI5ADaFtK0xE93HTFZsfpBkC/Z75mYDPF1e6vobbOZ3lZiXNmYyXL3}"

CORS_ORIGINS="${CORS_ORIGINS:-https://app.bricklyusa.com,https://www.bricklyusa.com}"
WEB_BASE_URL="${WEB_BASE_URL:-https://app.bricklyusa.com}"
DISABLE_EMAIL_VERIFICATION="${DISABLE_EMAIL_VERIFICATION:-true}"
ALLOW_EMAIL_BYPASS="${ALLOW_EMAIL_BYPASS:-false}"

AI_ENABLED="${AI_ENABLED:-true}"
AI_PROVIDER="${AI_PROVIDER:-openai}"
AI_REASONING_EFFORT="${AI_REASONING_EFFORT:-low}"
OPENAI_API_KEY_VALUE="${OPENAI_API_KEY:-}"
OPENAI_MODEL="${OPENAI_MODEL:-gpt-5-mini}"
OPENAI_BASE_URL="${OPENAI_BASE_URL:-https://api.openai.com/v1}"

BLOCKCHAIN_ENABLED="${BLOCKCHAIN_ENABLED:-false}"
BLOCKCHAIN_PROVIDER="${BLOCKCHAIN_PROVIDER:-demo-registry}"
BLOCKCHAIN_NETWORK="${BLOCKCHAIN_NETWORK:-sepolia}"
BLOCKCHAIN_CHAIN_ID="${BLOCKCHAIN_CHAIN_ID:-11155111}"
BLOCKCHAIN_RPC_URL="${BLOCKCHAIN_RPC_URL:-}"
BLOCKCHAIN_CONTRACT_ADDRESS="${BLOCKCHAIN_CONTRACT_ADDRESS:-}"
BLOCKCHAIN_DEPLOYER_PRIVATE_KEY_VALUE="${BLOCKCHAIN_DEPLOYER_PRIVATE_KEY:-}"
BLOCKCHAIN_SYNC_CONFIRMATIONS="${BLOCKCHAIN_SYNC_CONFIRMATIONS:-1}"

API_IMAGE="us-east1-docker.pkg.dev/${PROJECT}/${REPO}/brickly-api:${TAG}"
WEB_IMAGE="us-east1-docker.pkg.dev/${PROJECT}/${REPO}/brickly-web:${TAG}"
DB_IMAGE="us-east1-docker.pkg.dev/${PROJECT}/${REPO}/brickly-db:${TAG}"

TMP_DIR="$(mktemp -d)"
API_ENV_FILE="${TMP_DIR}/api.env.yaml"
WEB_ENV_FILE="${TMP_DIR}/web.env.yaml"

cleanup() {
  rm -rf "${TMP_DIR}"
}

trap cleanup EXIT

require_value() {
  local key="$1"
  local value="$2"
  if [[ -z "${value}" ]]; then
    echo "Missing required environment variable: ${key}" >&2
    exit 1
  fi
}

write_api_env_file() {
  cat >"${API_ENV_FILE}" <<EOF
DATABASE_URL: "${DB_URL}"
JWT_SECRET: "${JWT_SECRET_VALUE}"
CORS_ORIGINS: "${CORS_ORIGINS}"
WEB_BASE_URL: "${WEB_BASE_URL}"
DISABLE_EMAIL_VERIFICATION: "${DISABLE_EMAIL_VERIFICATION}"
ALLOW_EMAIL_BYPASS: "${ALLOW_EMAIL_BYPASS}"
AI_ENABLED: "${AI_ENABLED}"
AI_PROVIDER: "${AI_PROVIDER}"
AI_REASONING_EFFORT: "${AI_REASONING_EFFORT}"
OPENAI_API_KEY: "${OPENAI_API_KEY_VALUE}"
OPENAI_MODEL: "${OPENAI_MODEL}"
OPENAI_BASE_URL: "${OPENAI_BASE_URL}"
BLOCKCHAIN_ENABLED: "${BLOCKCHAIN_ENABLED}"
BLOCKCHAIN_PROVIDER: "${BLOCKCHAIN_PROVIDER}"
BLOCKCHAIN_NETWORK: "${BLOCKCHAIN_NETWORK}"
BLOCKCHAIN_CHAIN_ID: "${BLOCKCHAIN_CHAIN_ID}"
BLOCKCHAIN_RPC_URL: "${BLOCKCHAIN_RPC_URL}"
BLOCKCHAIN_CONTRACT_ADDRESS: "${BLOCKCHAIN_CONTRACT_ADDRESS}"
BLOCKCHAIN_DEPLOYER_PRIVATE_KEY: "${BLOCKCHAIN_DEPLOYER_PRIVATE_KEY_VALUE}"
BLOCKCHAIN_SYNC_CONFIRMATIONS: "${BLOCKCHAIN_SYNC_CONFIRMATIONS}"
EOF
}

write_web_env_file() {
  local api_url="$1"
  cat >"${WEB_ENV_FILE}" <<EOF
IN_DOCKER: "true"
NEXT_PUBLIC_API_BASE_URL: "${api_url}"
EOF
}

require_value "DATABASE_URL" "${DB_URL}"
require_value "JWT_SECRET" "${JWT_SECRET_VALUE}"

if [[ "${AI_ENABLED}" == "true" && "${AI_PROVIDER}" == "openai" ]]; then
  require_value "OPENAI_API_KEY" "${OPENAI_API_KEY_VALUE}"
fi

if [[ "${BLOCKCHAIN_ENABLED}" == "true" ]]; then
  require_value "BLOCKCHAIN_RPC_URL" "${BLOCKCHAIN_RPC_URL}"
  require_value "BLOCKCHAIN_CONTRACT_ADDRESS" "${BLOCKCHAIN_CONTRACT_ADDRESS}"
  require_value "BLOCKCHAIN_DEPLOYER_PRIVATE_KEY" "${BLOCKCHAIN_DEPLOYER_PRIVATE_KEY_VALUE}"
fi

write_api_env_file

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
API_URL=$(gcloud run deploy "${API_SERVICE}" \
  --image "${API_IMAGE}" \
  --region "${REGION}" \
  --env-vars-file "${API_ENV_FILE}" \
  --allow-unauthenticated \
  --format="value(status.url)")
echo "API_URL=${API_URL}"

write_web_env_file "${API_URL}"

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
WEB_URL=$(gcloud run deploy "${WEB_SERVICE}" \
  --image "${WEB_IMAGE}" \
  --region "${REGION}" \
  --env-vars-file "${WEB_ENV_FILE}" \
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
