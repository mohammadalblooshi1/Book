#!/usr/bin/env bash
# Runs the migration against a throwaway local Postgres (with a stubbed Supabase
# auth schema) and executes the tenant-isolation checks.
# Usage: PGHOST=/path/to/socket PGPORT=5432 PGUSER=postgres scripts/test-rls.sh
set -euo pipefail
DIR="$(cd "$(dirname "$0")/.." && pwd)"
DB="phoniex_rls_test_$$"
createdb "$DB"
trap 'dropdb "$DB"' EXIT
psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$DIR/supabase/tests/auth_stub.sql" 2>/dev/null || true
for f in "$DIR"/supabase/migrations/*.sql; do psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$f"; done
psql -d "$DB" -f "$DIR/supabase/tests/rls_isolation.sql"
