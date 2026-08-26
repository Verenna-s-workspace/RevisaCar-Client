#!/usr/bin/env bash
# Roda backend (Django :8001) e frontend (Vite :5174) como um só processo.
# Ctrl-C derruba os dois. Uso:  ./dev.sh   (ou  make dev)
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACK_PORT="${BACK_PORT:-8001}"
FRONT_PORT="${FRONT_PORT:-5174}"

# venv do backend (aceita .venv ou venv)
VENV=""
[ -d "$ROOT/backend/.venv" ] && VENV="$ROOT/backend/.venv"
[ -d "$ROOT/backend/venv" ]  && VENV="$ROOT/backend/venv"

cleanup() {
  echo ""
  echo "→ encerrando..."
  # mata o grupo de processos filhos
  kill 0 2>/dev/null || true
}
trap cleanup EXIT INT TERM

echo "→ backend  http://localhost:$BACK_PORT   (Django)"
(
  cd "$ROOT/backend"
  [ -n "$VENV" ] && source "$VENV/bin/activate"
  DEBUG=True python manage.py runserver "127.0.0.1:$BACK_PORT"
) 2>&1 | sed $'s/^/\033[36m[api]\033[0m /' &

echo "→ frontend http://localhost:$FRONT_PORT   (Vite · modo demo)"
(
  cd "$ROOT/frontend"
  npm run dev -- --port "$FRONT_PORT"
) 2>&1 | sed $'s/^/\033[35m[web]\033[0m /' &

echo ""
echo "  Abra:  http://localhost:$FRONT_PORT     (Ctrl-C encerra os dois)"
echo ""
wait
