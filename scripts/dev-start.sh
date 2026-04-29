#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUN_DIR="$REPO_ROOT/.run"
DB_URL="${DATABASE_URL:-postgres://app:app@localhost:5433/fractional}"
mkdir -p "$RUN_DIR"

log() {
  printf '[brickly] %s\n' "$1"
}

wait_for_port() {
  local port="$1"
  local attempts="${2:-60}"
  local i
  for ((i=0; i<attempts; i++)); do
    if lsof -i ":$port" >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
  done
  return 1
}

wait_for_http() {
  local url="$1"
  local attempts="${2:-60}"
  local i
  for ((i=0; i<attempts; i++)); do
    if curl -fsS "$url" >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
  done
  return 1
}

read_env_value() {
  local key="$1"
  local value
  value="$(grep -E "^${key}=" "$REPO_ROOT/.env" 2>/dev/null | tail -n 1 | cut -d'=' -f2- | tr -d '"')"
  printf '%s' "$value"
}

start_background() {
  local name="$1"
  local command="$2"
  local log_file="$RUN_DIR/${name}.log"
  local pid_file="$RUN_DIR/${name}.pid"

  if [[ -f "$pid_file" ]] && kill -0 "$(cat "$pid_file")" >/dev/null 2>&1; then
    log "$name already running with pid $(cat "$pid_file")"
    return 0
  fi

  log "starting $name"
  (
    cd "$REPO_ROOT"
    nohup bash -lc "$command" >"$log_file" 2>&1 &
    echo $! >"$pid_file"
  )
}

log "starting database"
(cd "$REPO_ROOT" && docker compose up db -d)
(cd "$REPO_ROOT" && docker compose exec -T db pg_isready -U app -d fractional >/dev/null)

log "generating prisma client"
(cd "$REPO_ROOT" && DATABASE_URL="$DB_URL" npm --workspace apps/api run prisma:generate)

USER_TABLE="$(cd "$REPO_ROOT" && docker compose exec -T db psql -U app -d fractional -tAc "SELECT to_regclass('public.\"User\"');" | tr -d '[:space:]')"
if [[ "$USER_TABLE" != 'User' ]]; then
  log "database schema missing, pushing current prisma schema"
  (cd "$REPO_ROOT" && DATABASE_URL="$DB_URL" npm --workspace apps/api exec prisma db push --schema prisma/schema.prisma)
fi

USER_COUNT="$(cd "$REPO_ROOT" && docker compose exec -T db psql -U app -d fractional -tAc 'SELECT COUNT(*) FROM "User";' | tr -d '[:space:]')"
if [[ -z "$USER_COUNT" || "$USER_COUNT" == '0' ]]; then
  log "database empty, seeding demo data"
  (cd "$REPO_ROOT" && DATABASE_URL="$DB_URL" npm --workspace apps/api run prisma:seed)
else
  log "database already seeded ($USER_COUNT users), skipping seed"
fi

BLOCKCHAIN_ENABLED="$(read_env_value 'BLOCKCHAIN_ENABLED')"
if [[ "$BLOCKCHAIN_ENABLED" == 'true' ]]; then
  if ! lsof -i :8545 >/dev/null 2>&1; then
    start_background "hardhat" "npm run chain:node"
    wait_for_port 8545 90 || { log 'hardhat did not start on port 8545'; exit 1; }
    log "deploying contracts to local hardhat"
    (cd "$REPO_ROOT" && npm run chain:deploy >>"$RUN_DIR/hardhat.log" 2>&1)
  else
    log "hardhat already running on port 8545"
  fi
else
  log "blockchain disabled in .env, skipping hardhat"
fi

if ! lsof -i :4000 >/dev/null 2>&1; then
  start_background "api" "npm --workspace apps/api run dev"
fi
wait_for_http "http://127.0.0.1:4000/health" 90 || { log 'api did not become healthy'; exit 1; }

if ! lsof -i :3000 >/dev/null 2>&1; then
  start_background "web" "npm --workspace apps/web run dev"
fi
wait_for_http "http://127.0.0.1:3000" 90 || { log 'web did not start on port 3000'; exit 1; }

log "Brickly is ready"
log "web: http://localhost:3000"
log "api: http://localhost:4000/health"
log "logs: $RUN_DIR"
