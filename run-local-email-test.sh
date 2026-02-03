#!/usr/bin/env bash
set -euo pipefail

# === EDIT THESE ===
export SMTP_HOST="smtp.office365.com"
export SMTP_PORT="587"
export SMTP_USER="your_m365_email@yourdomain.com"
export SMTP_PASS="your_m365_password"
export SMTP_FROM="your_m365_email@yourdomain.com"
export WEB_BASE_URL="http://localhost:3000"

# Optional: choose DB URL (Docker uses db:5432 internally)
export DATABASE_URL="postgres://app:app@db:5432/fractional"
export JWT_SECRET="dev-secret"

# Build + run
docker compose down
docker compose up -d --build

echo "API:  http://localhost:4000"
echo "WEB:  http://localhost:3000"
