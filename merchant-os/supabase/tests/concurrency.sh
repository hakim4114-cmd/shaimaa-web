#!/usr/bin/env bash
# Overselling under concurrency: N parallel sessions try to confirm N orders
# that compete for a single unit. Exactly one may succeed.
# Usage: supabase/tests/concurrency.sh <database>   (called by scripts/db-test.sh)
set -euo pipefail
DB="$1"; N=8; RESULTS=$(mktemp)
q() { psql -X -q -At -v ON_ERROR_STOP=1 -d "$DB" "$@"; }
OWNER=00000000-0000-0000-0000-0000000000aa
as_owner="select set_config('request.jwt.claims', '{\"sub\":\"$OWNER\"}', false); set role authenticated;"

q -c "insert into auth.users (id) values ('$OWNER')"
ORG=$(q -c "$as_owner select id from public.create_organization('Race', 'race-test')" | tail -1)
VARIANT=$(q -c "$as_owner
  with p as (insert into public.products (organization_id, name, status) values ('$ORG', 'P', 'active') returning id)
  insert into public.product_variants (organization_id, product_id, sku, price_cents) select '$ORG', id, 'RACE-1', 10000 from p returning id" | tail -1)
LOC=$(q -c "select id from public.inventory_locations where organization_id = '$ORG'")
q -c "$as_owner select public.adjust_inventory('$VARIANT', '$LOC', 'receipt', 1, 'race')" >/dev/null

ORDERS=()
for i in $(seq 1 $N); do
  ORDERS+=("$(q -c "$as_owner select id from public.create_order('$ORG', '{\"customer\":{\"full_name\":\"Race $i\",\"phone\":\"+2126000000$(printf %02d $i)\"},\"items\":[{\"variant_id\":\"$VARIANT\",\"quantity\":1}]}')" | tail -1)")
done

for order in "${ORDERS[@]}"; do
  ( q -c "$as_owner select public.transition_order('$order', 'confirmed')" >/dev/null 2>&1 && echo ok || echo fail ) &
done > "$RESULTS" ; wait

OK=$(grep -c ok "$RESULTS" || true); rm -f "$RESULTS"
STATE=$(q -c "select on_hand || '/' || reserved from public.inventory_levels where variant_id = '$VARIANT'")
CONFIRMED=$(q -c "select count(*) from public.orders where organization_id = '$ORG' and status = 'confirmed'")
if [ "$OK" = 1 ] && [ "$CONFIRMED" = 1 ] && [ "$STATE" = "1/1" ]; then
  echo "  ok - $N concurrent confirmations for 1 unit: exactly one succeeded (on_hand/reserved = $STATE)"
else
  echo "  FAIL - concurrency: succeeded=$OK confirmed=$CONFIRMED level=$STATE"; exit 1
fi
