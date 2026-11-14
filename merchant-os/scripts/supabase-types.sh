#!/usr/bin/env bash
# Regenerates lib/supabase/database.types.ts from a Supabase project's schema.
# Usage: SUPABASE_ACCESS_TOKEN=sbp_… scripts/supabase-types.sh <project-ref>
set -euo pipefail
cd "$(dirname "$0")/.."
REF="${1:?project ref required}"
: "${SUPABASE_ACCESS_TOKEN:?set SUPABASE_ACCESS_TOKEN}"
OUT=lib/supabase/database.types.ts
{
  echo "// Generated from the live database schema by scripts/supabase-types.sh — do not edit by hand."
  curl -sS --fail-with-body --max-time 60 -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}" \
    "https://api.supabase.com/v1/projects/${REF}/types/typescript?included_schemas=public" |
    python3 -c 'import json, sys; print(json.load(sys.stdin)["types"])'
} > "$OUT.tmp"
mv "$OUT.tmp" "$OUT"
echo "wrote $OUT"
