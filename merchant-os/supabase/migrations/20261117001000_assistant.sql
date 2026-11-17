-- Merchant OS — read-only connection for Claude (MCP), 1.1.0
-- The owner creates a secret connector URL in Settings. The server stores
-- only its SHA-256 hash. Every call runs as the user who created it (their
-- current role is checked again, so removing them from the organization
-- cuts access), reads only, and never returns customer phone numbers or
-- addresses.

create table public.assistant_tokens (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 60),
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  last_used_at timestamptz,
  created_at timestamptz not null default now()
);
create index assistant_tokens_org_idx on public.assistant_tokens (organization_id);

revoke all on public.assistant_tokens from anon, authenticated;
grant select (id, organization_id, user_id, name, last_used_at, created_at), delete on public.assistant_tokens to authenticated;
alter table public.assistant_tokens enable row level security;
create policy assistant_tokens_select on public.assistant_tokens for select to authenticated
  using (app.has_role(organization_id, '{owner,admin}'));
create policy assistant_tokens_delete on public.assistant_tokens for delete to authenticated
  using (app.has_role(organization_id, '{owner,admin}'));
create trigger audit after insert or delete on public.assistant_tokens for each row execute function app.write_audit_log();

create function public.create_assistant_token(p_organization_id uuid, p_name text, p_token_hash text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
begin
  perform app.require_role(p_organization_id, array['owner', 'admin']::public.member_role[]);
  if (select count(*) from public.assistant_tokens t where t.organization_id = p_organization_id) >= 5 then
    raise exception 'TOO_MANY_TOKENS' using errcode = 'P0001';
  end if;
  insert into public.assistant_tokens (organization_id, user_id, name, token_hash)
  values (p_organization_id, auth.uid(), btrim(p_name), lower(p_token_hash))
  returning id into v_id;
  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- One entry point for every assistant tool. Callable without a session; the
-- token hash is the credential.
-- ---------------------------------------------------------------------------
create function public.assistant_call(p_token_hash text, p_tool text, p_args jsonb default '{}') returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  tz constant text := 'Africa/Casablanca';
  v_token public.assistant_tokens;
  v_org uuid;
  v_from date := coalesce((p_args ->> 'from')::date, (now() at time zone tz)::date - 29);
  v_to date := coalesce((p_args ->> 'to')::date, (now() at time zone tz)::date);
  v_limit integer := least(greatest(coalesce((p_args ->> 'limit')::integer, 20), 1), 100);
  v_result jsonb;
begin
  select * into v_token from public.assistant_tokens where token_hash = lower(coalesce(p_token_hash, ''));
  if not found then
    raise exception 'INVALID_TOKEN' using errcode = '42501';
  end if;
  v_org := v_token.organization_id;
  -- Act as the token's creator for this transaction; their role is checked again.
  perform set_config('request.jwt.claims', json_build_object('sub', v_token.user_id, 'role', 'authenticated')::text, true);
  perform app.require_role(v_org, array['owner', 'admin']::public.member_role[]);
  update public.assistant_tokens set last_used_at = now() where id = v_token.id;

  case p_tool
    when 'business_summary' then
      v_result := jsonb_build_object('from', v_from, 'to', v_to, 'currency', 'MAD', 'amounts_in', 'cents')
        || public.report_summary(v_org, v_from, v_to);

    when 'today' then
      v_result := jsonb_build_object(
        'calls_due', (select count(*) from public.orders o where o.organization_id = v_org and o.status in ('new', 'confirmation_pending') and (o.next_call_at is null or o.next_call_at <= now())),
        'to_prepare', (select count(*) from public.orders o where o.organization_id = v_org and o.status in ('confirmed', 'preparing')),
        'waiting_pickup', (select count(*) from public.shipments s where s.organization_id = v_org and s.status = 'pending'),
        'delivery_problems', (select count(*) from public.shipments s where s.organization_id = v_org and s.status = 'failed_attempt'),
        'returns_to_receive', (select count(*) from public.returns r where r.organization_id = v_org and r.status = 'awaiting_receipt'),
        'cod_receivable_cents', (select coalesce(sum(o.cod_amount_cents), 0) from public.orders o where o.organization_id = v_org and o.payment_status = 'awaiting_remittance'));

    when 'orders' then
      select coalesce(jsonb_agg(x), '[]') into v_result from (
        select o.order_number, o.status, o.payment_status, o.city, o.source, o.total_cents, o.cod_amount_cents, o.call_attempts,
               o.last_call_outcome, o.created_at, o.delivered_at,
               (select string_agg(i.product_name || coalesce(' (' || nullif(i.variant_title, '') || ')', '') || ' x' || i.quantity, '; ') from public.order_items i where i.order_id = o.id) as items,
               (select c.name from public.marketing_campaigns c where c.id = o.campaign_id) as campaign
        from public.orders o
        where o.organization_id = v_org
          and (p_args ->> 'status' is null or o.status::text = p_args ->> 'status')
          and (o.created_at at time zone tz)::date between v_from and v_to
        order by o.created_at desc
        limit v_limit
      ) x;

    when 'order' then
      select jsonb_build_object(
        'order_number', o.order_number, 'status', o.status, 'payment_status', o.payment_status, 'city', o.city,
        'subtotal_cents', o.subtotal_cents, 'discount_cents', o.discount_cents, 'shipping_fee_cents', o.shipping_fee_cents,
        'cod_amount_cents', o.cod_amount_cents, 'notes', o.notes, 'created_at', o.created_at,
        'items', (select jsonb_agg(jsonb_build_object('product', i.product_name, 'variant', i.variant_title, 'sku', i.sku, 'quantity', i.quantity, 'unit_price_cents', i.unit_price_cents)) from public.order_items i where i.order_id = o.id),
        'calls', (select jsonb_agg(jsonb_build_object('outcome', a.outcome, 'note', a.note, 'at', a.created_at) order by a.created_at) from public.order_call_attempts a where a.order_id = o.id),
        'shipment', (select jsonb_build_object('tracking', s.tracking_number, 'status', s.status, 'carrier_status', s.carrier_status, 'carrier_message', s.carrier_message, 'unreachable_count', s.unreachable_count) from public.shipments s where s.order_id = o.id and s.status <> 'cancelled' limit 1),
        'history', (select jsonb_agg(jsonb_build_object('type', e.event_type, 'to', e.to_status, 'note', e.note, 'at', e.created_at) order by e.created_at) from public.order_events e where e.order_id = o.id)
      ) into v_result
      from public.orders o
      where o.organization_id = v_org and o.order_number = upper(btrim(coalesce(p_args ->> 'order_number', '')));
      v_result := coalesce(v_result, jsonb_build_object('error', 'order not found'));

    when 'stock' then
      select jsonb_build_object(
        'variants', coalesce(jsonb_agg(jsonb_build_object(
          'sku', h.sku, 'product', h.product_name, 'variant', h.variant_title, 'on_hand', h.on_hand, 'value_cents', h.value_cents,
          'available', (select coalesce(sum(l.available), 0) from public.inventory_levels l where l.variant_id = h.variant_id),
          'min_stock', (select v.min_stock_level from public.product_variants v where v.id = h.variant_id),
          'days_since_last_sale', case when coalesce(h.last_outbound_at, h.first_receipt_at) is null then null else extract(day from now() - coalesce(h.last_outbound_at, h.first_receipt_at))::integer end
        )), '[]'))
      into v_result from public.stock_health(v_org) h;

    when 'campaigns' then
      select jsonb_build_object('from', v_from, 'to', v_to, 'campaigns', coalesce(jsonb_agg(to_jsonb(c)), '[]'))
      into v_result from public.campaign_report(v_org, v_from, v_to) c;

    when 'cash' then
      v_result := jsonb_build_object(
        'receivable_by_age', (
          select jsonb_build_object(
            'days_0_7', coalesce(sum(o.cod_amount_cents) filter (where o.delivered_at > now() - interval '7 days'), 0),
            'days_8_14', coalesce(sum(o.cod_amount_cents) filter (where o.delivered_at <= now() - interval '7 days' and o.delivered_at > now() - interval '14 days'), 0),
            'days_15_plus', coalesce(sum(o.cod_amount_cents) filter (where o.delivered_at <= now() - interval '14 days'), 0))
          from public.orders o where o.organization_id = v_org and o.payment_status = 'awaiting_remittance'),
        'last_payouts', (
          select coalesce(jsonb_agg(jsonb_build_object('reference', r.reference, 'received_on', r.received_on, 'net_cents', r.net_received_cents, 'fees_cents', r.fees_cents + r.other_charges_cents) order by r.received_on desc), '[]')
          from (select * from public.cod_remittances r0 where r0.organization_id = v_org order by r0.received_on desc limit 10) r));

    else
      raise exception 'UNKNOWN_TOOL' using errcode = 'P0001';
  end case;
  return v_result;
end;
$$;

revoke execute on function public.create_assistant_token(uuid, text, text) from public, anon;
grant execute on function public.create_assistant_token(uuid, text, text) to authenticated;
revoke execute on function public.assistant_call(text, text, jsonb) from public;
grant execute on function public.assistant_call(text, text, jsonb) to anon, authenticated;
