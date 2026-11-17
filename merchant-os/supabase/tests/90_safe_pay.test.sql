-- Safe owner pay (1.3.0). Rolled back.
\set ON_ERROR_STOP 1
\set QUIET 1
begin;

create schema tests;
grant usage on schema tests to anon, authenticated, service_role;
create function tests.expect_error(p_sql text, p_expected text) returns void language plpgsql as $$
begin
  begin execute p_sql;
  exception when others then
    if sqlerrm not like '%' || p_expected || '%' then
      raise exception 'Expected error "%" but got "%" for: %', p_expected, sqlerrm, p_sql;
    end if;
    return;
  end;
  raise exception 'Expected error "%" but statement succeeded: %', p_expected, p_sql;
end; $$;
create function tests.eq(p_actual anyelement, p_expected anyelement, p_label text) returns void language plpgsql as $$
begin
  if p_actual is distinct from p_expected then
    raise exception 'FAIL %: expected %, got %', p_label, p_expected, p_actual;
  end if;
  raise notice 'ok - %', p_label;
end; $$;
create function tests.login(p_user uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
$$;
grant execute on all functions in schema tests to anon, authenticated, service_role;

create function tests.new_confirmed_order(p_org uuid, p_variant uuid, p_phone text) returns uuid language plpgsql as $$
declare v_id uuid;
begin
  v_id := (public.create_order(p_org, jsonb_build_object(
    'customer', jsonb_build_object('full_name', 'Client Test', 'phone', p_phone, 'address', 'Hay Test'),
    'items', jsonb_build_array(jsonb_build_object('variant_id', p_variant, 'quantity', 1)),
    'shipping_fee_cents', 3500))).id;
  perform public.log_call_attempt(v_id, 'confirmed');
  return v_id;
end; $$;
grant execute on function tests.new_confirmed_order(uuid, uuid, text) to authenticated;

\set owner    '70000000-0000-0000-0000-00000000000a'
\set finance  '70000000-0000-0000-0000-00000000000f'
insert into auth.users (id) values (:'owner'), (:'finance');
set local role authenticated;
select tests.login(:'owner');
select id as org from public.create_organization('Pay Test', 'pay-test') \gset
insert into public.organization_members (organization_id, user_id, role) values (:'org', :'finance', 'finance');

select tests.eq(public.safe_withdrawal(:'org') ->> 'configured', 'false', 'nothing configured yet');
insert into public.cash_settings (organization_id, opening_date, reserve_floor_cents, owner_fund_name) values (:'org', current_date - 10, 100000, 'Owner pay');
insert into public.cash_entries (organization_id, kind, amount_cents, entry_date, note) values (:'org', 'opening', 500000, current_date - 10, 'Start');
insert into public.expenses (organization_id, category, amount_cents, incurred_on) values (:'org', 'packaging', 20000, current_date - 5);
insert into public.payables (organization_id, counterparty, category, amount_cents, due_on) values (:'org', 'Supplier A', 'inventory_purchase', 150000, current_date + 7) returning id as pay1 \gset
insert into public.payables (organization_id, counterparty, amount_cents, due_on) values (:'org', 'Later', 99999, current_date + 60);

-- No closed month: nothing earned yet.
select tests.eq((public.safe_withdrawal(:'org') ->> 'cash_balance_cents')::bigint, 480000::bigint, 'balance = opening − expenses');
select tests.eq((public.safe_withdrawal(:'org') ->> 'free_cash_cents')::bigint, 230000::bigint, 'free cash = balance − obligations within 30 days − reserve');
select tests.eq(public.safe_withdrawal(:'org') ->> 'reason', 'no_closed_month', 'no pay before the first closed month');
select tests.eq((public.safe_withdrawal(:'org') ->> 'safe_cents')::bigint, 0::bigint, 'safe amount is zero');
select tests.expect_error(format($$select public.record_owner_withdrawal(%L, 5000, current_date, 'short')$$, :'org'), 'OVER_SAFE_LIMIT');

-- A closed month with 300 MAD set aside as owner pay.
insert into public.monthly_closes (organization_id, month, net_profit_cents, allocations)
  values (:'org', date_trunc('month', current_date)::date, 1000000, '[{"name": "Restock", "cents": 700000}, {"name": "Owner pay", "cents": 300000}]');
select tests.eq((public.safe_withdrawal(:'org') ->> 'pay_earned_cents')::bigint, 300000::bigint, 'pay earned from the owner fund');
select tests.eq((public.safe_withdrawal(:'org') ->> 'safe_cents')::bigint, 230000::bigint, 'limited by free cash');
select tests.eq(public.safe_withdrawal(:'org') ->> 'reason', 'limited_by_cash', 'reason explains the limit');

select public.record_owner_withdrawal(:'org', 100000, current_date, '');
select tests.eq((public.safe_withdrawal(:'org') ->> 'safe_cents')::bigint, 130000::bigint, 'withdrawal reduces both cash and pay left');
select tests.expect_error(format($$select public.record_owner_withdrawal(%L, 200000, current_date, 'short')$$, :'org'), 'OVER_SAFE_LIMIT');
select tests.eq((public.record_owner_withdrawal(:'org', 200000, current_date, 'Medical emergency, agreed')).over_limit, true, 'over-limit allowed only with a written reason, and flagged');

-- Paying an obligation posts an expense once.
select public.pay_payable(:'pay1', current_date);
select tests.eq((select count(*)::int from public.expenses where organization_id = :'org' and category = 'inventory_purchase' and amount_cents = 150000), 1, 'paid obligation becomes an expense');
select tests.expect_error(format($$select public.pay_payable(%L, current_date)$$, :'pay1'), 'ALREADY_PAID');
select tests.eq((select count(*)::int from public.payables where organization_id = :'org' and counterparty = 'Supplier A' and paid_on is null), 0, 'one-off obligation does not repeat');
insert into public.payables (organization_id, counterparty, category, amount_cents, due_on, recurrence) values (:'org', 'Internet', 'internet', 20000, '2026-01-31', 'monthly') returning id as net \gset
select public.pay_payable(:'net', current_date);
select tests.eq((select due_on::text from public.payables where organization_id = :'org' and counterparty = 'Internet' and paid_on is null), '2026-02-28', 'paying a monthly obligation creates the next month (end of month kept)');
select tests.expect_error(format($$insert into public.cash_entries (organization_id, kind, amount_cents, entry_date) values (%L, 'owner_withdrawal', -1, current_date)$$, :'org'), 'row-level security');
select tests.expect_error($$delete from public.cash_entries$$, 'permission denied');

select tests.login(:'finance');
select tests.expect_error(format($$select public.record_owner_withdrawal(%L, 1, current_date, '')$$, :'org'), 'FORBIDDEN');
select tests.eq((public.safe_withdrawal(:'org') ->> 'configured'), 'true', 'finance can read the safe amount');

rollback;
