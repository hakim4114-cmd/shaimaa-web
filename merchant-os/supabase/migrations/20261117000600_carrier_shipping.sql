-- Merchant OS — carrier shipping (0.6.0)
-- Shipments created through a carrier API (first adapter: Sendit) and
-- carrier status updates received by webhook. See docs/INTEGRATIONS.md.

-- Carrier options per provider, e.g. Sendit:
-- {"pickup_district_id": 123, "pickup_city": "Kénitra", "allow_open": true, "allow_try": true}
alter table public.shipping_providers
  add column settings jsonb not null default '{}' check (jsonb_typeof(settings) = 'object');
grant update (name, is_active, notes, settings) on public.shipping_providers to authenticated;

-- What the carrier last told us, kept next to our own normalized status.
alter table public.shipments
  add column carrier_status text check (carrier_status is null or carrier_status ~ '^[A-Z_]{2,40}$'),
  add column carrier_message text check (char_length(carrier_message) <= 1000),
  add column carrier_district_id text check (char_length(carrier_district_id) <= 40),
  add column carrier_district_name text check (char_length(carrier_district_name) <= 160),
  add column deliver_by date,
  add column unreachable_count integer not null default 0 check (unreachable_count >= 0),
  add column proof_url text check (proof_url is null or proof_url ~ '^https://'),
  add column carrier_updated_at timestamptz;

-- Every webhook call as received (after signature verification), for audit
-- and idempotency: the same carrier event is applied once.
create table public.carrier_events (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  provider_id uuid not null,
  shipment_id uuid,
  tracking_number text not null check (char_length(tracking_number) between 1 and 64),
  carrier_status text not null check (char_length(carrier_status) <= 40),
  payload jsonb not null,
  dedupe_key text not null,
  outcome text not null check (outcome in ('applied', 'duplicate', 'unknown_shipment', 'ignored')),
  received_at timestamptz not null default now(),
  foreign key (provider_id, organization_id) references public.shipping_providers (id, organization_id) on delete cascade deferrable,
  foreign key (shipment_id, organization_id) references public.shipments (id, organization_id) on delete cascade deferrable
);
create unique index carrier_events_dedupe_uq on public.carrier_events (provider_id, dedupe_key) where outcome <> 'unknown_shipment';
create index carrier_events_shipment_idx on public.carrier_events (shipment_id, received_at);
create trigger immutable before update or delete on public.carrier_events for each row execute function app.prevent_mutation();

revoke all on public.carrier_events from anon, authenticated;
grant select on public.carrier_events to authenticated;
alter table public.carrier_events enable row level security;
create policy carrier_events_select on public.carrier_events for select to authenticated
  using (app.has_role(organization_id, '{owner,admin,operator,warehouse}'));

-- ---------------------------------------------------------------------------
-- Shipment status core, without the caller check, so the webhook (no user)
-- and the manual RPC share exactly the same rules.
-- ---------------------------------------------------------------------------
create function app.apply_shipment_status(
  p_shipment_id uuid,
  p_status public.shipment_status,
  p_note text,
  p_source public.data_source
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
  if v_order_status = 'ready_to_ship' and p_status in ('picked_up', 'in_transit', 'out_for_delivery', 'delivered', 'failed_attempt', 'returned_to_sender') then
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

create or replace function public.update_shipment_status(
  p_shipment_id uuid,
  p_status public.shipment_status,
  p_note text default null,
  p_source public.data_source default 'manual'
) returns public.shipments
language plpgsql security definer set search_path = '' as $$
declare
  v_org uuid;
begin
  select organization_id into v_org from public.shipments where id = p_shipment_id;
  if v_org is null then
    raise exception 'SHIPMENT_NOT_FOUND' using errcode = 'P0002';
  end if;
  perform app.require_role(v_org, array['owner', 'admin', 'operator', 'warehouse']::public.member_role[]);
  return app.apply_shipment_status(p_shipment_id, p_status, p_note, p_source);
end;
$$;

-- ---------------------------------------------------------------------------
-- A parcel created at the carrier: moves the order to "ready to ship"
-- (through preparing when needed) and records the shipment.
-- p_carrier: {"district_id", "district_name", "status"}
-- ---------------------------------------------------------------------------
create function public.register_carrier_shipment(
  p_order_id uuid,
  p_provider_id uuid,
  p_tracking_number text,
  p_shipping_cost_cents bigint,
  p_carrier jsonb default '{}'
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
  if v_order.status not in ('confirmed', 'preparing', 'ready_to_ship') then
    raise exception 'ORDER_NOT_SHIPPABLE' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.shipping_providers p where p.id = p_provider_id and p.organization_id = v_order.organization_id and p.is_active) then
    raise exception 'PROVIDER_NOT_FOUND' using errcode = 'P0002';
  end if;
  if coalesce(btrim(p_tracking_number), '') = '' then
    raise exception 'TRACKING_REQUIRED' using errcode = 'P0001';
  end if;

  if v_order.status = 'confirmed' then
    perform app.apply_order_transition(v_order.id, 'preparing', null);
  end if;
  if v_order.status in ('confirmed', 'preparing') then
    perform app.apply_order_transition(v_order.id, 'ready_to_ship', null);
  end if;

  insert into public.shipments (
    organization_id, order_id, provider_id, tracking_number, shipping_cost_cents, cod_amount_cents, created_by,
    carrier_status, carrier_district_id, carrier_district_name, carrier_updated_at
  ) values (
    v_order.organization_id, v_order.id, p_provider_id, btrim(p_tracking_number), coalesce(p_shipping_cost_cents, 0),
    v_order.cod_amount_cents, auth.uid(),
    nullif(p_carrier ->> 'status', ''), nullif(p_carrier ->> 'district_id', ''), nullif(p_carrier ->> 'district_name', ''), now()
  ) returning * into v_shipment;

  insert into public.shipment_events (organization_id, shipment_id, status, data_source, actor_id)
  values (v_shipment.organization_id, v_shipment.id, 'pending', 'api', auth.uid());
  perform app.add_order_event(v_order, 'shipment', null, null, v_shipment.tracking_number);
  return v_shipment;
end;
$$;

-- ---------------------------------------------------------------------------
-- Carrier webhook event, called by the server after verifying the carrier's
-- signature. service_role only: there is no signed-in user.
-- p_status: our normalized status, or NULL when the carrier status only
-- updates details (e.g. "postponed" keeps the shipment where it is).
-- ---------------------------------------------------------------------------
create function public.apply_carrier_event(
  p_provider_id uuid,
  p_tracking_number text,
  p_carrier_status text,
  p_status public.shipment_status,
  p_payload jsonb
) returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_provider public.shipping_providers;
  v_shipment public.shipments;
  v_key text := md5(coalesce(p_tracking_number, '') || '|' || coalesce(p_carrier_status, '') || '|' || coalesce(p_payload ->> 'lastActionAt', p_payload::text));
  v_outcome text;
begin
  select * into v_provider from public.shipping_providers where id = p_provider_id;
  if not found then
    raise exception 'PROVIDER_NOT_FOUND' using errcode = 'P0002';
  end if;

  select * into v_shipment from public.shipments
  where provider_id = p_provider_id and tracking_number = btrim(p_tracking_number) and status <> 'cancelled'
  for update;
  if not found then
    insert into public.carrier_events (organization_id, provider_id, tracking_number, carrier_status, payload, dedupe_key, outcome)
    values (v_provider.organization_id, p_provider_id, left(btrim(coalesce(p_tracking_number, '?')), 64), left(coalesce(p_carrier_status, ''), 40), p_payload, v_key, 'unknown_shipment');
    return 'unknown_shipment';
  end if;

  begin
    insert into public.carrier_events (organization_id, provider_id, shipment_id, tracking_number, carrier_status, payload, dedupe_key, outcome)
    values (v_provider.organization_id, p_provider_id, v_shipment.id, v_shipment.tracking_number, left(coalesce(p_carrier_status, ''), 40), p_payload, v_key, 'applied');
  exception when unique_violation then
    return 'duplicate';
  end;

  update public.shipments
  set carrier_status = case when p_carrier_status ~ '^[A-Z_]{2,40}$' then p_carrier_status else carrier_status end,
      carrier_message = coalesce(left(nullif(btrim(p_payload ->> 'message'), ''), 1000), carrier_message),
      deliver_by = coalesce(case when (p_payload ->> 'deliverBy') ~ '^\d{4}-\d{2}-\d{2}$' then (p_payload ->> 'deliverBy')::date end, deliver_by),
      unreachable_count = greatest(unreachable_count, coalesce(case when (p_payload ->> 'counterUnreachable') ~ '^\d{1,3}$' then (p_payload ->> 'counterUnreachable')::integer end, 0)),
      proof_url = coalesce(case when (p_payload ->> 'proofImage') ~ '^https://' then left(p_payload ->> 'proofImage', 500) end, proof_url),
      carrier_updated_at = now()
  where id = v_shipment.id;

  v_outcome := 'applied';
  if p_status is not null and p_status is distinct from v_shipment.status
     and v_shipment.status not in ('delivered', 'returned_to_sender') then
    perform app.apply_shipment_status(v_shipment.id, p_status, nullif(btrim(p_payload ->> 'message'), ''), 'api');
  elsif p_status is not null and p_status = 'failed_attempt' and v_shipment.status = 'failed_attempt' then
    -- A further failed attempt is still an attempt.
    update public.shipments set delivery_attempts = delivery_attempts + 1 where id = v_shipment.id;
  end if;
  return v_outcome;
end;
$$;

revoke execute on function app.apply_shipment_status(uuid, public.shipment_status, text, public.data_source) from public, anon, authenticated;
revoke execute on function public.register_carrier_shipment(uuid, uuid, text, bigint, jsonb) from public, anon;
grant execute on function public.register_carrier_shipment(uuid, uuid, text, bigint, jsonb) to authenticated;
revoke execute on function public.apply_carrier_event(uuid, text, text, public.shipment_status, jsonb) from public, anon, authenticated;
grant execute on function public.apply_carrier_event(uuid, text, text, public.shipment_status, jsonb) to service_role;
grant execute on function app.apply_shipment_status(uuid, public.shipment_status, text, public.data_source) to service_role;
grant usage on schema app to service_role;
