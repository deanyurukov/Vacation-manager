#!/usr/bin/env bash
# Seeds demo users, projects, a team, and a QA role (MongoDB must be running).
# From repo root:
#   chmod +x scripts/seed-demo.sh
#   ./scripts/seed-demo.sh

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/server/VacationManager.Api"

dotnet run -- --seed-demo
