-- Merchant OS — recurring obligations and reminders (1.4.0)
-- A recurring obligation (rent, internet, phone…) is entered once; paying it
-- creates the next one. Claude can list what is owed.

alter table public.payables
  add column recurrence text not null default 'none' check (recurrence in ('none', 'weekly', 'monthly', 'yearly'));
grant update (recurrence) on public.payables to authenticated;

create or replace function public.pay_payable(p_payable_id uuid, p_paid_on date) returns public.payables
language plpgsql security definer set search_path = '' as $$
declare
  v_payable public.payables;
  v_expense uuid;
begin
  select * into v_payable from public.payables where id = p_payable_id for update;
  if not found then
    raise exception 'NOT_FOUND' using errcode = 'P0002';
  end if;
  perform app.require_role(v_payable.organization_id, array['owner', 'admin', 'finance']::public.member_role[]);
  if v_payable.paid_on is not null then
    raise exception 'ALREADY_PAID' using errcode = 'P0001';
  end if;
  if p_paid_on is null or p_paid_on > (now() at time zone 'Africa/Casablanca')::date then
    raise exception 'INVALID_DATE' using errcode = 'P0001';
  end if;
  insert into public.expenses (organization_id, category, amount_cents, incurred_on, description, created_by)
  values (v_payable.organization_id, v_payable.category, v_payable.amount_cents, p_paid_on,
          left(v_payable.counterparty || coalesce(' — ' || nullif(v_payable.description, ''), ''), 500), auth.uid())
  returning id into v_expense;
  update public.payables set paid_on = p_paid_on, expense_id = v_expense where id = v_payable.id returning * into v_payable;
  -- Recurring obligation: the next one is created when this one is paid.
  if v_payable.recurrence <> 'none' then
    insert into public.payables (organization_id, counterparty, description, category, amount_cents, due_on, recurrence, created_by)
    values (v_payable.organization_id, v_payable.counterparty, v_payable.description, v_payable.category, v_payable.amount_cents,
            (v_payable.due_on + case v_payable.recurrence when 'weekly' then interval '7 days' when 'monthly' then interval '1 month' else interval '1 year' end)::date,
            v_payable.recurrence, auth.uid());
  end if;
  return v_payable;
end;
$$;

create or replace function public.assistant_call(p_token_hash text, p_tool text, p_args jsonb default '{}') returns jsonb
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

    when 'obligations' then
      select jsonb_build_object(
        'today', (now() at time zone tz)::date,
        'open', coalesce(jsonb_agg(jsonb_build_object(
          'to', p.counterparty, 'what', p.description, 'category', p.category, 'amount_cents', p.amount_cents,
          'due_on', p.due_on, 'overdue', p.due_on < (now() at time zone tz)::date, 'recurrence', p.recurrence
        ) order by p.due_on), '[]'))
      into v_result
      from public.payables p where p.organization_id = v_org and p.paid_on is null;

    else
      raise exception 'UNKNOWN_TOOL' using errcode = 'P0001';
  end case;
  return v_result;
end;
$$;
