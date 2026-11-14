#!/usr/bin/env bash
# Runs a SQL file against a Supabase project through the Management API
# (POST /v1/projects/{ref}/database/query) and prints the JSON result.
# Usage: SUPABASE_ACCESS_TOKEN=sbp_… scripts/supabase-sql.sh <project-ref> <file.sql>
# The token is a personal access token (Account → Access Tokens). Keep it
# out of files and shell history; revoke it when no longer needed.
set -euo pipefail
REF="${1:?project ref required}"
FILE="${2:?sql file required}"
: "${SUPABASE_ACCESS_TOKEN:?set SUPABASE_ACCESS_TOKEN}"

python3 -c 'import json, sys; print(json.dumps({"query": open(sys.argv[1]).read()}))' "$FILE" |
  curl -sS --fail-with-body --max-time 120 -X POST "https://api.supabase.com/v1/projects/${REF}/database/query" \
    -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}" -H "Content-Type: application/json" --data-binary @-
echo
