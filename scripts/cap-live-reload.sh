#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

target="${1:-android}"
port="${2:-43127}"

echo "Vite가 0.0.0.0:${port} 에서 실행 중이어야 합니다 (npm run dev 또는 npm run dev:live)."
npx cap run "$target" --live-reload --port "$port"
