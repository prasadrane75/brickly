#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUN_DIR="$REPO_ROOT/.run"

status_line() {
  local name="$1"
  local state="$2"
  local detail="$3"
  printf '%-10s %-8s %s\n' "$name" "$state" "$detail"
}

pid_detail() {
  local name="$1"
  local pid_file="$RUN_DIR/${name}.pid"
  if [[ -f "$pid_file" ]]; then
    local pid
    pid="$(cat "$pid_file")"
    if kill -0 "$pid" >/dev/null 2>&1; then
      printf 'pid=%s log=%s/%s.log' "$pid" "$RUN_DIR" "$name"
      return 0
    fi
    printf 'stale pid file=%s' "$pid_file"
    return 0
  fi
  printf 'no pid file'
}

http_check() {
  local url="$1"
  curl -fsS "$url" >/dev/null 2>&1
}

port_check() {
  local port="$1"
  lsof -i ":$port" >/dev/null 2>&1
}

printf 'Brickly status\n'
printf 'repo: %s\n' "$REPO_ROOT"
printf 'run:  %s\n\n' "$RUN_DIR"

if docker compose -f "$REPO_ROOT/docker-compose.yml" ps db --status running >/dev/null 2>&1; then
  status_line "database" "UP" "docker compose db running on 5433"
else
  status_line "database" "DOWN" "docker compose db not running"
fi

if http_check "http://127.0.0.1:4000/health"; then
  status_line "api" "UP" "http://localhost:4000/health $(pid_detail api)"
else
  status_line "api" "DOWN" "http://localhost:4000/health $(pid_detail api)"
fi

if http_check "http://127.0.0.1:3000"; then
  status_line "web" "UP" "http://localhost:3000 $(pid_detail web)"
else
  status_line "web" "DOWN" "http://localhost:3000 $(pid_detail web)"
fi

if port_check 8545; then
  status_line "hardhat" "UP" "port 8545 open $(pid_detail hardhat)"
else
  status_line "hardhat" "DOWN" "port 8545 closed $(pid_detail hardhat)"
fi

printf '\nPort usage\n'
for port in 3000 4000 5433 8545; do
  if lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; then
    printf ':%s\n' "$port"
    lsof -nP -iTCP:"$port" -sTCP:LISTEN
  else
    printf ':%s not listening\n' "$port"
  fi
  printf '\n'
done
