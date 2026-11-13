#!/usr/bin/env bash
# Verifies migrations and database behaviour on a disposable PostgreSQL
# database. Requires psql and a server reachable through the standard PG*
# environment variables (PGHOST, PGPORT, PGUSER). The superuser connection
# is used to create and drop the temporary database.
set -euo pipefail

cd "$(dirname "$0")/.."
DB="merchant_os_test_$$"

cleanup() { dropdb --if-exists "$DB" >/dev/null 2>&1 || true; }
trap cleanup EXIT

createdb "$DB"
run() { psql -X -q -v ON_ERROR_STOP=1 -d "$DB" "$@"; }

run -f supabase/tests/00_supabase_stub.sql
for migration in supabase/migrations/*.sql; do
  echo "migrate: $migration"
  run -f "$migration"
done
for test_file in supabase/tests/*.test.sql; do
  echo "test: $test_file"
  run -o /dev/null -f "$test_file" 2>&1 | sed 's/^psql:[^ ]* NOTICE:  /  /'
done
echo "test: supabase/tests/concurrency.sh"
supabase/tests/concurrency.sh "$DB"
echo "ALL DATABASE CHECKS PASSED"
