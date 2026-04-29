#!/usr/bin/env bash
set -euo pipefail

COMPOSE_FILE=${COMPOSE_FILE:-docker-compose.prod_.yml}
PROJECT=${PROJECT:-bricklyusa}
REPO=${REPO:-guidprncons}
REGION=${REGION:-us-east1}
TAG=${TAG:-}

if [[ -z "${TAG}" ]]; then
  echo "TAG is required (e.g., TAG=prod-20260208)"
  exit 1
fi

if [[ ! -f "${COMPOSE_FILE}" ]]; then
  echo "Compose file not found: ${COMPOSE_FILE}"
  exit 1
fi

extract_env() {
  local service="$1"
  local key="$2"
  python3 - "$service" "$key" "$COMPOSE_FILE" <<'PY'
from pathlib import Path
import sys
import re

svc = sys.argv[1]
key = sys.argv[2]
compose_file = sys.argv[3]

text = Path(compose_file).read_text().splitlines()
current = None
in_env = False

for line in text:
    stripped = line.strip()
    if not stripped or stripped.startswith("#"):
        continue
    if not line.startswith(" "):
        current = None
        in_env = False
        continue
    if line.startswith("  ") and stripped.endswith(":") and stripped[:-1] != "environment":
        name = stripped[:-1]
        if name in ("db", "api", "web"):
            current = name
        else:
            # ignore nested keys
            current = current
        in_env = False
        continue
    if current == svc and stripped == "environment:":
        in_env = True
        continue
    if in_env:
        if line.startswith("      "):
            if ":" in stripped:
                k, v = stripped.split(":", 1)
            elif "=" in stripped:
                k, v = stripped.split("=", 1)
            else:
                k = v = None
            if k == key:
                v = v.strip().strip('"')
                print(v)
                sys.exit(0)
        if line.startswith("  ") and not line.startswith("    "):
            in_env = False

print("")
PY
}

API_DATABASE_URL=$(extract_env "api" "DATABASE_URL")
API_JWT_SECRET=$(extract_env "api" "JWT_SECRET")
API_CORS_ORIGINS=$(extract_env "api" "CORS_ORIGINS")
API_DISABLE_EMAIL_VERIFICATION=$(extract_env "api" "DISABLE_EMAIL_VERIFICATION")
WEB_API_BASE_URL=$(extract_env "web" "NEXT_PUBLIC_API_BASE_URL")

if [[ -z "${API_DATABASE_URL}" || -z "${API_JWT_SECRET}" || -z "${WEB_API_BASE_URL}" ]]; then
  echo "Failed to extract envs from ${COMPOSE_FILE}."
  echo "DATABASE_URL=${API_DATABASE_URL}"
  echo "JWT_SECRET=${API_JWT_SECRET}"
  echo "CORS_ORIGINS=${API_CORS_ORIGINS}"
  echo "DISABLE_EMAIL_VERIFICATION=${API_DISABLE_EMAIL_VERIFICATION}"
  echo "NEXT_PUBLIC_API_BASE_URL=${WEB_API_BASE_URL}"
  exit 1
fi

WEB_IMAGE="us-east1-docker.pkg.dev/${PROJECT}/${REPO}/brickly-web:${TAG}"
API_IMAGE="us-east1-docker.pkg.dev/${PROJECT}/${REPO}/brickly-api:${TAG}"

echo "Building images..."
docker buildx build --platform linux/amd64,linux/arm64 \
  --build-arg NEXT_PUBLIC_API_BASE_URL="${WEB_API_BASE_URL}" \
  -t "${WEB_IMAGE}" \
  -t "us-east1-docker.pkg.dev/${PROJECT}/${REPO}/brickly-web:latest" \
  -f apps/web/Dockerfile --push .

docker buildx build --platform linux/amd64,linux/arm64 \
  -t "${API_IMAGE}" \
  -t "us-east1-docker.pkg.dev/${PROJECT}/${REPO}/brickly-api:latest" \
  -f apps/api/Dockerfile --push .

echo "Deploying API..."
cat > /tmp/api-env.yaml <<EOF
DATABASE_URL: "${API_DATABASE_URL}"
JWT_SECRET: "${API_JWT_SECRET}"
${API_CORS_ORIGINS:+CORS_ORIGINS: \"${API_CORS_ORIGINS}\"}
${API_DISABLE_EMAIL_VERIFICATION:+DISABLE_EMAIL_VERIFICATION: \"${API_DISABLE_EMAIL_VERIFICATION}\"}
EOF

gcloud run deploy api \
  --image "${API_IMAGE}" \
  --region "${REGION}" \
  --env-vars-file /tmp/api-env.yaml \
  --allow-unauthenticated

echo "Deploying Web..."
gcloud run deploy web \
  --image "${WEB_IMAGE}" \
  --region "${REGION}" \
  --set-env-vars IN_DOCKER=true,NEXT_PUBLIC_API_BASE_URL="${WEB_API_BASE_URL}" \
  --allow-unauthenticated

echo "Done."
