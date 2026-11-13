-- Merchant OS — business operations (Phase 1)
-- Every state change that touches stock, order status, shipments, COD or
-- returns runs here, inside one transaction, with row locks. Errors are
-- raised as UPPER_SNAKE codes that the app maps to translated messages.

-- ---------------------------------------------------------------------------
-- Internal helpers (not executable by API roles)
-- ---------------------------------------------------------------------------
create function app.next_counter(p_organization_id uuid, p_name text) returns bigint
language plpgsql security definer set search_path = '' as $$
declare
  v_value bigint;
begin
  insert into public.organization_counters as c (organization_id, name, value)
  values (p_organization_id, p_name, 1)
  on conflict (organization_id, name) do update set value = c.value + 1
  returning c.value into v_value;
  return v_value;
end;
$$;

-- The only writer of inventory_levels. Applies all bucket deltas to one row
-- atomically and appends the matching movement.
create function app.move_stock(
  p_organization_id uuid,
  p_variant_id uuid,
  p_location_id uuid,
  p_type public.inventory_movement_type,
  p_on_hand integer,
  p_reserved integer,
  p_damaged integer,
  p_inspection integer,
  p_reference_type text,
  p_reference_id uuid,
  p_note text
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_level public.inventory_levels%rowtype;
begin
  insert into public.inventory_levels (organization_id, variant_id, location_id)
  values (p_organization_id, p_variant_id, p_location_id)
  on conflict (variant_id, location_id) do nothing;

  select * into v_level from public.inventory_levels
  where variant_id = p_variant_id and location_id = p_location_id
  for update;

  if v_level.organization_id <> p_organization_id then
    raise exception 'TENANT_MISMATCH' using errcode = 'P0001';
  end if;

  if v_level.on_hand + p_on_hand < 0
     or v_level.reserved + p_reserved < 0
     or v_level.reserved + p_reserved > v_level.on_hand + p_on_hand
     or v_level.damaged + p_damaged < 0
     or v_level.inspection + p_inspection < 0 then
    raise exception 'INSUFFICIENT_STOCK' using errcode = 'P0001', detail = p_variant_id::text;
  end if;

  update public.inventory_levels
  set on_hand = on_hand + p_on_hand,
      reserved = reserved + p_reserved,
      damaged = damaged + p_damaged,
      inspection = inspection + p_inspection
  where variant_id = p_variant_id and location_id = p_location_id;

  insert into public.inventory_movements (
    organization_id, variant_id, location_id, movement_type,
    delta_on_hand, delta_reserved, delta_damaged, delta_inspection,
    reference_type, reference_id, note, created_by
  ) values (
    p_organization_id, p_variant_id, p_location_id, p_type,
    p_on_hand, p_reserved, p_damaged, p_inspection,
    p_reference_type, p_reference_id, nullif(btrim(p_note), ''), auth.uid()
  );
end;
$$;

create function app.add_order_event(
  p_order public.orders,
  p_type text,
  p_from public.order_status,
  p_to public.order_status,
  p_note text
) returns void
language sql security definer set search_path = '' as $$
  insert into public.order_events (organization_id, order_id, event_type, from_status, to_status, note, actor_id)
  values (p_order.organization_id, p_order.id, p_type, p_from, p_to, nullif(btrim(p_note), ''), auth.uid());
$$;

-- Applies an order status change and its stock / payment / return side
-- effects. Caller must have checked authorization.
create function app.apply_order_transition(p_order_id uuid, p_to public.order_status, p_note text)
returns public.orders
language plpgsql security definer set search_path = '' as $$
declare
  v_order public.orders;
  v_item record;
  v_return_id uuid;
  v_from public.order_status;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'ORDER_NOT_FOUND' using errcode = 'P0002';
  end if;
  v_from := v_order.status;

  if not exists (select 1 from app.order_transitions t where t.from_status = v_from and t.to_status = p_to) then
    raise exception 'INVALID_TRANSITION' using errcode = 'P0001', detail = format('%s -> %s', v_from, p_to);
  end if;

  -- Stock effects. Items are processed in variant order to avoid deadlocks.
  if p_to = 'confirmed' then
    for v_item in
      select variant_id, sum(quantity)::integer as qty from public.order_items
      where order_id = v_order.id group by variant_id order by variant_id
    loop
      perform app.move_stock(v_order.organization_id, v_item.variant_id, v_order.location_id, 'reservation',
        0, v_item.qty, 0, 0, 'order', v_order.id, v_order.order_number);
    end loop;
    v_order.stock_state := 'reserved';
    v_order.confirmed_at := now();

  elsif p_to = 'cancelled' then
    if v_order.stock_state = 'reserved' then
      for v_item in
        select variant_id, sum(quantity)::integer as qty from public.order_items
        where order_id = v_order.id group by variant_id order by variant_id
      loop
        perform app.move_stock(v_order.organization_id, v_item.variant_id, v_order.location_id, 'reservation_release',
          0, -v_item.qty, 0, 0, 'order', v_order.id, v_order.order_number);
      end loop;
      v_order.stock_state := 'released';
    end if;
    v_order.cancelled_at := now();

  elsif p_to = 'shipped' then
    for v_item in
      select variant_id, sum(quantity)::integer as qty from public.order_items
      where order_id = v_order.id group by variant_id order by variant_id
    loop
      perform app.move_stock(v_order.organization_id, v_item.variant_id, v_order.location_id, 'shipment',
        -v_item.qty, -v_item.qty, 0, 0, 'order', v_order.id, v_order.order_number);
    end loop;
    v_order.stock_state := 'shipped';
    v_order.shipped_at := now();

  elsif p_to = 'delivered' then
    v_order.delivered_at := now();
    v_order.payment_status := case when v_order.cod_amount_cents > 0 then 'awaiting_remittance' else 'settled' end;

  elsif p_to in ('refused', 'returned', 'exchange_requested') then
    insert into public.returns (organization_id, order_id, kind, reason, created_by)
    values (
      v_order.organization_id, v_order.id,
      case p_to when 'refused' then 'refusal' when 'returned' then 'return' else 'exchange' end::public.return_kind,
      coalesce(btrim(p_note), ''), auth.uid()
    )
    returning id into v_return_id;

    insert into public.return_items (organization_id, return_id, order_item_id, variant_id, quantity)
    select v_order.organization_id, v_return_id, i.id, i.variant_id, i.quantity
    from public.order_items i where i.order_id = v_order.id;
  end if;

  update public.orders
  set status = p_to,
      stock_state = v_order.stock_state,
      payment_status = v_order.payment_status,
      confirmed_at = v_order.confirmed_at,
      shipped_at = v_order.shipped_at,
      delivered_at = v_order.delivered_at,
      cancelled_at = v_order.cancelled_at
  where id = v_order.id
  returning * into v_order;

  perform app.add_order_event(v_order, 'status_changed', v_from, p_to, p_note);
  return v_order;
end;
$$;

-- ---------------------------------------------------------------------------
-- Public RPCs
-- ---------------------------------------------------------------------------

-- Creates an organization with the caller as owner and a default location.
create function public.create_organization(p_name text, p_slug text) returns public.organizations
language plpgsql security definer set search_path = '' as $$
declare
  v_org public.organizations;
begin
  if auth.uid() is null then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  insert into public.organizations (name, slug) values (btrim(p_name), lower(btrim(p_slug)))
  returning * into v_org;

  insert into public.organization_members (organization_id, user_id, role) values (v_org.id, auth.uid(), 'owner');
  insert into public.inventory_locations (organization_id, name, is_default) values (v_org.id, 'Main warehouse', true);
  return v_org;
end;
$$;

-- Manual stock operations. p_quantity is always positive; the type decides
-- the direction:
--   receipt       on_hand +q            (goods received)
--   adjustment    on_hand +/-q          (count correction; p_quantity may be negative)
--   mark_damaged  on_hand -q, damaged +q
--   write_off     damaged -q            (damaged goods disposed)
create function public.adjust_inventory(
  p_variant_id uuid,
  p_location_id uuid,
  p_type public.inventory_movement_type,
  p_quantity integer,
  p_note text
) returns public.inventory_levels
language plpgsql security definer set search_path = '' as $$
declare
  v_org uuid;
  v_level public.inventory_levels;
begin
  select organization_id into v_org from public.product_variants where id = p_variant_id;
  if v_org is null then
    raise exception 'VARIANT_NOT_FOUND' using errcode = 'P0002';
  end if;
  perform app.require_role(v_org, array['owner', 'admin', 'warehouse']::public.member_role[]);

  if p_quantity is null or p_quantity = 0 or (p_type <> 'adjustment' and p_quantity < 0) then
    raise exception 'INVALID_QUANTITY' using errcode = 'P0001';
  end if;
  if p_type = 'adjustment' and coalesce(btrim(p_note), '') = '' then
    raise exception 'NOTE_REQUIRED' using errcode = 'P0001';
  end if;

  case p_type
    when 'receipt' then
      perform app.move_stock(v_org, p_variant_id, p_location_id, p_type, p_quantity, 0, 0, 0, 'manual', null, p_note);
    when 'adjustment' then
      perform app.move_stock(v_org, p_variant_id, p_location_id, p_type, p_quantity, 0, 0, 0, 'manual', null, p_note);
    when 'mark_damaged' then
      perform app.move_stock(v_org, p_variant_id, p_location_id, p_type, -p_quantity, 0, p_quantity, 0, 'manual', null, p_note);
    when 'write_off' then
      perform app.move_stock(v_org, p_variant_id, p_location_id, p_type, 0, 0, -p_quantity, 0, 'manual', null, p_note);
    else
      raise exception 'INVALID_MOVEMENT_TYPE' using errcode = 'P0001';
  end case;

  select * into v_level from public.inventory_levels where variant_id = p_variant_id and location_id = p_location_id;
  return v_level;
end;
$$;

-- Creates an order from trusted catalog prices. Payload:
-- {
--   "customer": {"full_name", "phone" (E.164), "city", "address"},
--   "items": [{"variant_id", "quantity"}],
--   "discount_cents", "shipping_fee_cents", "cod_amount_cents" (default total),
--   "source", "campaign_id", "store_id", "location_id", "notes", "internal_notes"
-- }
create function public.create_order(p_organization_id uuid, p_payload jsonb) returns public.orders
language plpgsql security definer set search_path = '' as $$
declare
  v_customer jsonb := coalesce(p_payload -> 'customer', '{}'::jsonb);
  v_customer_id uuid;
  v_location_id uuid;
  v_order public.orders;
  v_item jsonb;
  v_variant record;
  v_qty integer;
  v_subtotal bigint := 0;
  v_discount bigint := coalesce((p_payload ->> 'discount_cents')::bigint, 0);
  v_shipping bigint := coalesce((p_payload ->> 'shipping_fee_cents')::bigint, 0);
  v_total bigint;
  v_cod bigint;
begin
  perform app.require_role(p_organization_id, array['owner', 'admin', 'operator']::public.member_role[]);

  if jsonb_typeof(p_payload -> 'items') is distinct from 'array' or jsonb_array_length(p_payload -> 'items') = 0 then
    raise exception 'ORDER_ITEMS_REQUIRED' using errcode = 'P0001';
  end if;
  if jsonb_array_length(p_payload -> 'items') > 50 then
    raise exception 'TOO_MANY_ITEMS' using errcode = 'P0001';
  end if;

  v_location_id := coalesce(
    (p_payload ->> 'location_id')::uuid,
    (select l.id from public.inventory_locations l where l.organization_id = p_organization_id and l.is_default)
  );
  if v_location_id is null then
    raise exception 'LOCATION_REQUIRED' using errcode = 'P0001';
  end if;

  insert into public.customers as c (organization_id, full_name, phone, city, address)
  values (
    p_organization_id,
    btrim(coalesce(v_customer ->> 'full_name', '')),
    btrim(coalesce(v_customer ->> 'phone', '')),
    btrim(coalesce(v_customer ->> 'city', '')),
    btrim(coalesce(v_customer ->> 'address', ''))
  )
  on conflict (organization_id, phone) do update
    set full_name = excluded.full_name,
        city = case when excluded.city <> '' then excluded.city else c.city end,
        address = case when excluded.address <> '' then excluded.address else c.address end
  returning id into v_customer_id;

  insert into public.orders (
    organization_id, store_id, order_number, customer_id, location_id, source, campaign_id,
    city, notes, internal_notes, created_by
  ) values (
    p_organization_id,
    (p_payload ->> 'store_id')::uuid,
    (select o.order_prefix from public.organizations o where o.id = p_organization_id)
      || '-' || lpad(app.next_counter(p_organization_id, 'order_number')::text, 6, '0'),
    v_customer_id,
    v_location_id,
    coalesce((p_payload ->> 'source')::public.order_source, 'other'),
    (p_payload ->> 'campaign_id')::uuid,
    btrim(coalesce(v_customer ->> 'city', '')),
    coalesce(p_payload ->> 'notes', ''),
    coalesce(p_payload ->> 'internal_notes', ''),
    auth.uid()
  ) returning * into v_order;

  insert into public.order_contacts (order_id, organization_id, full_name, phone, address)
  select v_order.id, p_organization_id, c.full_name, c.phone, c.address
  from public.customers c where c.id = v_customer_id;

  for v_item in select * from jsonb_array_elements(p_payload -> 'items') loop
    v_qty := (v_item ->> 'quantity')::integer;
    if v_qty is null or v_qty < 1 then
      raise exception 'INVALID_QUANTITY' using errcode = 'P0001';
    end if;

    select v.id, v.sku, v.title, v.price_cents, v.cost_cents, p.name as product_name
    into v_variant
    from public.product_variants v
    join public.products p on p.id = v.product_id
    where v.id = (v_item ->> 'variant_id')::uuid
      and v.organization_id = p_organization_id
      and v.status = 'active'
      and p.status = 'active';

    if not found then
      raise exception 'VARIANT_NOT_AVAILABLE' using errcode = 'P0001', detail = v_item ->> 'variant_id';
    end if;

    insert into public.order_items (
      organization_id, order_id, variant_id, product_name, variant_title, sku, quantity, unit_price_cents, unit_cost_cents
    ) values (
      p_organization_id, v_order.id, v_variant.id, v_variant.product_name, v_variant.title, v_variant.sku,
      v_qty, v_variant.price_cents, v_variant.cost_cents
    );
    v_subtotal := v_subtotal + v_qty * v_variant.price_cents;
  end loop;

  if v_discount < 0 or v_discount > v_subtotal then
    raise exception 'INVALID_DISCOUNT' using errcode = 'P0001';
  end if;
  if v_shipping < 0 then
    raise exception 'INVALID_SHIPPING_FEE' using errcode = 'P0001';
  end if;
  v_total := v_subtotal - v_discount + v_shipping;
  v_cod := coalesce((p_payload ->> 'cod_amount_cents')::bigint, v_total);
  if v_cod < 0 or v_cod > v_total then
    raise exception 'INVALID_COD_AMOUNT' using errcode = 'P0001';
  end if;

  update public.orders
  set subtotal_cents = v_subtotal, discount_cents = v_discount, shipping_fee_cents = v_shipping,
      total_cents = v_total, cod_amount_cents = v_cod
  where id = v_order.id
  returning * into v_order;

  perform app.add_order_event(v_order, 'created', null, 'new', null);
  return v_order;
end;
$$;

create function public.transition_order(p_order_id uuid, p_to public.order_status, p_note text default null)
returns public.orders
language plpgsql security definer set search_path = '' as $$
declare
  v_org uuid;
begin
  select organization_id into v_org from public.orders where id = p_order_id;
  if v_org is null then
    raise exception 'ORDER_NOT_FOUND' using errcode = 'P0002';
  end if;

  if p_to in ('confirmation_pending', 'confirmed', 'cancelled', 'returned', 'exchange_requested') then
    perform app.require_role(v_org, array['owner', 'admin', 'operator']::public.member_role[]);
  else
    perform app.require_role(v_org, array['owner', 'admin', 'operator', 'warehouse']::public.member_role[]);
  end if;

  if p_to = 'cancelled' and coalesce(btrim(p_note), '') = '' then
    raise exception 'NOTE_REQUIRED' using errcode = 'P0001';
  end if;

  return app.apply_order_transition(p_order_id, p_to, p_note);
end;
$$;

create function public.add_order_note(p_order_id uuid, p_note text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_order public.orders;
begin
  select * into v_order from public.orders where id = p_order_id;
  if not found then
    raise exception 'ORDER_NOT_FOUND' using errcode = 'P0002';
  end if;
  perform app.require_role(v_order.organization_id, array['owner', 'admin', 'operator', 'warehouse']::public.member_role[]);
  if coalesce(btrim(p_note), '') = '' then
    raise exception 'NOTE_REQUIRED' using errcode = 'P0001';
  end if;
  perform app.add_order_event(v_order, 'note', null, null, p_note);
end;
$$;

-- ---------------------------------------------------------------------------
-- Shipping
-- ---------------------------------------------------------------------------
create function public.create_shipment(
  p_order_id uuid,
  p_provider_id uuid,
  p_tracking_number text,
  p_shipping_cost_cents bigint
) returns public.shipments
language plpgsql security definer set search_path = '' as $$
declare
  v_order public.orders;
  v_shipment public.shipments;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'ORDER_NOT_FOUND' using errcode = 'P0002';
  end if;
  perform app.require_role(v_order.organization_id, array['owner', 'admin', 'operator', 'warehouse']::public.member_role[]);

  if v_order.status not in ('confirmed', 'preparing', 'ready_to_ship', 'shipped') then
    raise exception 'ORDER_NOT_SHIPPABLE' using errcode = 'P0001';
  end if;

  insert into public.shipments (organization_id, order_id, provider_id, tracking_number, shipping_cost_cents, cod_amount_cents, created_by)
  values (
    v_order.organization_id, v_order.id, p_provider_id, nullif(btrim(p_tracking_number), ''),
    coalesce(p_shipping_cost_cents, 0), v_order.cod_amount_cents, auth.uid()
  ) returning * into v_shipment;

  insert into public.shipment_events (organization_id, shipment_id, status, actor_id)
  values (v_shipment.organization_id, v_shipment.id, 'pending', auth.uid());
  perform app.add_order_event(v_order, 'shipment', null, null, coalesce(v_shipment.tracking_number, 'Shipment created'));
  return v_shipment;
end;
$$;

-- Records a carrier status. Carrier "delivered" / "returned_to_sender" move
-- a shipped order to delivered / refused so the two never disagree.
create function public.update_shipment_status(
  p_shipment_id uuid,
  p_status public.shipment_status,
  p_note text default null,
  p_source public.data_source default 'manual'
) returns public.shipments
language plpgsql security definer set search_path = '' as $$
declare
  v_shipment public.shipments;
  v_order_status public.order_status;
begin
  select * into v_shipment from public.shipments where id = p_shipment_id for update;
  if not found then
    raise exception 'SHIPMENT_NOT_FOUND' using errcode = 'P0002';
  end if;
  perform app.require_role(v_shipment.organization_id, array['owner', 'admin', 'operator', 'warehouse']::public.member_role[]);

  if v_shipment.status in ('delivered', 'returned_to_sender', 'cancelled') then
    raise exception 'SHIPMENT_CLOSED' using errcode = 'P0001';
  end if;
  if p_status = 'pending' then
    raise exception 'INVALID_TRANSITION' using errcode = 'P0001';
  end if;

  update public.shipments
  set status = p_status,
      delivery_attempts = delivery_attempts + case when p_status in ('failed_attempt', 'delivered') then 1 else 0 end,
      shipped_at = coalesce(shipped_at, case when p_status in ('picked_up', 'in_transit', 'out_for_delivery') then now() end),
      delivered_at = case when p_status = 'delivered' then now() else delivered_at end,
      returned_at = case when p_status = 'returned_to_sender' then now() else returned_at end
  where id = p_shipment_id
  returning * into v_shipment;

  insert into public.shipment_events (organization_id, shipment_id, status, note, data_source, actor_id)
  values (v_shipment.organization_id, v_shipment.id, p_status, nullif(btrim(p_note), ''), p_source, auth.uid());

  select status into v_order_status from public.orders where id = v_shipment.order_id;
  if v_order_status = 'ready_to_ship' and p_status in ('picked_up', 'in_transit', 'out_for_delivery', 'delivered', 'failed_attempt') then
    perform app.apply_order_transition(v_shipment.order_id, 'shipped', 'Carrier: picked up');
    v_order_status := 'shipped';
  end if;

  if v_order_status = 'shipped' and p_status = 'delivered' then
    perform app.apply_order_transition(v_shipment.order_id, 'delivered', 'Carrier: delivered');
  elsif v_order_status = 'shipped' and p_status = 'returned_to_sender' then
    perform app.apply_order_transition(v_shipment.order_id, 'refused', coalesce(nullif(btrim(p_note), ''), 'Carrier: returned to sender'));
  end if;

  return v_shipment;
end;
$$;

-- ---------------------------------------------------------------------------
-- COD reconciliation
-- p_items: [{"order_id", "collected_cents", "fee_cents"}]
-- collected_cents must equal the order's COD amount: discrepancies must be
-- resolved before settling, never silently absorbed.
-- ---------------------------------------------------------------------------
create function public.record_cod_remittance(
  p_organization_id uuid,
  p_provider_id uuid,
  p_reference text,
  p_received_on date,
  p_items jsonb,
  p_note text default ''
) returns public.cod_remittances
language plpgsql security definer set search_path = '' as $$
declare
  v_remittance public.cod_remittances;
  v_item jsonb;
  v_order public.orders;
  v_collected bigint;
  v_fee bigint;
  v_gross bigint := 0;
  v_fees bigint := 0;
begin
  perform app.require_role(p_organization_id, array['owner', 'admin', 'finance']::public.member_role[]);

  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'REMITTANCE_ITEMS_REQUIRED' using errcode = 'P0001';
  end if;
  if p_received_on is null or p_received_on > current_date then
    raise exception 'INVALID_DATE' using errcode = 'P0001';
  end if;

  insert into public.cod_remittances (organization_id, provider_id, reference, received_on, gross_collected_cents, fees_cents, net_received_cents, note, created_by)
  values (p_organization_id, p_provider_id, coalesce(btrim(p_reference), ''), p_received_on, 0, 0, 0, coalesce(p_note, ''), auth.uid())
  returning * into v_remittance;

  for v_item in select * from jsonb_array_elements(p_items) loop
    select * into v_order from public.orders
    where id = (v_item ->> 'order_id')::uuid and organization_id = p_organization_id
    for update;
    if not found then
      raise exception 'ORDER_NOT_FOUND' using errcode = 'P0002', detail = v_item ->> 'order_id';
    end if;
    if v_order.payment_status <> 'awaiting_remittance' then
      raise exception 'ORDER_NOT_AWAITING_REMITTANCE' using errcode = 'P0001', detail = v_order.order_number;
    end if;

    v_collected := (v_item ->> 'collected_cents')::bigint;
    v_fee := coalesce((v_item ->> 'fee_cents')::bigint, 0);
    if v_collected is distinct from v_order.cod_amount_cents then
      raise exception 'COD_AMOUNT_MISMATCH' using errcode = 'P0001', detail = v_order.order_number;
    end if;
    if v_fee < 0 or v_fee > v_collected then
      raise exception 'INVALID_FEE' using errcode = 'P0001', detail = v_order.order_number;
    end if;

    insert into public.cod_remittance_items (organization_id, remittance_id, order_id, collected_cents, fee_cents)
    values (p_organization_id, v_remittance.id, v_order.id, v_collected, v_fee);

    update public.orders set payment_status = 'settled' where id = v_order.id returning * into v_order;
    perform app.add_order_event(v_order, 'payment', null, null, 'COD settled: ' || coalesce(nullif(v_remittance.reference, ''), v_remittance.id::text));

    v_gross := v_gross + v_collected;
    v_fees := v_fees + v_fee;
  end loop;

  update public.cod_remittances
  set gross_collected_cents = v_gross, fees_cents = v_fees, net_received_cents = v_gross - v_fees
  where id = v_remittance.id
  returning * into v_remittance;
  return v_remittance;
end;
$$;

-- ---------------------------------------------------------------------------
-- Returns
-- Returned goods never go straight back to sellable stock: they enter the
-- inspection bucket on receipt and only an explicit "resellable" decision
-- restocks them.
-- ---------------------------------------------------------------------------
create function public.receive_return(p_return_id uuid, p_return_shipping_fee_cents bigint default 0)
returns public.returns
language plpgsql security definer set search_path = '' as $$
declare
  v_return public.returns;
  v_location uuid;
  v_item record;
begin
  select * into v_return from public.returns where id = p_return_id for update;
  if not found then
    raise exception 'RETURN_NOT_FOUND' using errcode = 'P0002';
  end if;
  perform app.require_role(v_return.organization_id, array['owner', 'admin', 'warehouse']::public.member_role[]);
  if v_return.status <> 'awaiting_receipt' then
    raise exception 'INVALID_TRANSITION' using errcode = 'P0001';
  end if;
  if coalesce(p_return_shipping_fee_cents, 0) < 0 then
    raise exception 'INVALID_FEE' using errcode = 'P0001';
  end if;

  select location_id into v_location from public.orders where id = v_return.order_id;

  for v_item in
    select variant_id, sum(quantity)::integer as qty from public.return_items
    where return_id = v_return.id group by variant_id order by variant_id
  loop
    perform app.move_stock(v_return.organization_id, v_item.variant_id, v_location, 'return_receipt',
      0, 0, 0, v_item.qty, 'return', v_return.id, null);
  end loop;

  update public.returns
  set status = 'received', received_at = now(), return_shipping_fee_cents = coalesce(p_return_shipping_fee_cents, 0)
  where id = v_return.id
  returning * into v_return;
  return v_return;
end;
$$;

create function public.inspect_return_item(p_return_item_id uuid, p_condition public.item_condition)
returns public.return_items
language plpgsql security definer set search_path = '' as $$
declare
  v_item public.return_items;
  v_return public.returns;
  v_location uuid;
begin
  select * into v_item from public.return_items where id = p_return_item_id for update;
  if not found then
    raise exception 'RETURN_ITEM_NOT_FOUND' using errcode = 'P0002';
  end if;
  select * into v_return from public.returns where id = v_item.return_id for update;
  perform app.require_role(v_return.organization_id, array['owner', 'admin', 'warehouse']::public.member_role[]);

  if v_return.status <> 'received' or v_item.condition <> 'pending' then
    raise exception 'INVALID_TRANSITION' using errcode = 'P0001';
  end if;
  if p_condition = 'pending' then
    raise exception 'INVALID_CONDITION' using errcode = 'P0001';
  end if;

  select location_id into v_location from public.orders where id = v_return.order_id;

  if p_condition = 'resellable' then
    perform app.move_stock(v_item.organization_id, v_item.variant_id, v_location, 'restock',
      v_item.quantity, 0, 0, -v_item.quantity, 'return', v_return.id, null);
  elsif p_condition = 'damaged' then
    perform app.move_stock(v_item.organization_id, v_item.variant_id, v_location, 'mark_damaged',
      0, 0, v_item.quantity, -v_item.quantity, 'return', v_return.id, null);
  else -- missing: never physically arrived
    perform app.move_stock(v_item.organization_id, v_item.variant_id, v_location, 'write_off',
      0, 0, 0, -v_item.quantity, 'return', v_return.id, 'Missing from return parcel');
  end if;

  update public.return_items
  set condition = p_condition, decided_by = auth.uid(), decided_at = now()
  where id = v_item.id
  returning * into v_item;

  if not exists (select 1 from public.return_items where return_id = v_return.id and condition = 'pending') then
    update public.returns set status = 'inspected' where id = v_return.id;
  end if;
  return v_item;
end;
$$;

create function public.record_refund(p_return_id uuid, p_amount_cents bigint) returns public.returns
language plpgsql security definer set search_path = '' as $$
declare
  v_return public.returns;
  v_total bigint;
begin
  select * into v_return from public.returns where id = p_return_id for update;
  if not found then
    raise exception 'RETURN_NOT_FOUND' using errcode = 'P0002';
  end if;
  perform app.require_role(v_return.organization_id, array['owner', 'admin', 'finance']::public.member_role[]);
  if v_return.status = 'closed' then
    raise exception 'RETURN_CLOSED' using errcode = 'P0001';
  end if;

  select total_cents into v_total from public.orders where id = v_return.order_id;
  if p_amount_cents is null or p_amount_cents <= 0 or p_amount_cents > v_total then
    raise exception 'INVALID_REFUND_AMOUNT' using errcode = 'P0001';
  end if;

  update public.returns set refund_amount_cents = p_amount_cents, refunded_at = now()
  where id = v_return.id
  returning * into v_return;
  return v_return;
end;
$$;

create function public.close_return(p_return_id uuid) returns public.returns
language plpgsql security definer set search_path = '' as $$
declare
  v_return public.returns;
begin
  select * into v_return from public.returns where id = p_return_id for update;
  if not found then
    raise exception 'RETURN_NOT_FOUND' using errcode = 'P0002';
  end if;
  perform app.require_role(v_return.organization_id, array['owner', 'admin', 'operator']::public.member_role[]);
  if v_return.status <> 'inspected' then
    raise exception 'INVALID_TRANSITION' using errcode = 'P0001';
  end if;
  update public.returns set status = 'closed', closed_at = now() where id = v_return.id returning * into v_return;
  return v_return;
end;
$$;
