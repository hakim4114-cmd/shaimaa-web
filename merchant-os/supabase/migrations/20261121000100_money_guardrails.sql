-- Merchant OS — money guardrails (1.16.0)
--
-- Rules that keep the capital and the reserve intact (docs/BUSINESS_RULES.md,
-- "Money guardrails"). Where the app is the decision point (owner pay), a
-- breach is refused outright. Where money leaves outside the app (ads, stock,
-- packaging are paid by card or cash), refusing to record would only hide the
-- spending, so a breach needs a written reason and is flagged for the monthly
-- report instead.
--
-- 1. Capital floor: business value (cash + stock at cost + COD waiting at the
--    carrier) below capital_floor_pct of the money put in (opening + capital
--    in) → no owner withdrawal at all.
-- 2. Reserve: no owner withdrawal that leaves cash below the reserve; an
--    expense that does needs a reason ('reserve').
-- 3. Ad budget per calendar month: ad_budget_revenue_pct of last month's
--    delivered revenue, or ad_budget_cents when last month had none; above it
--    an ad expense needs a reason ('ad_budget').
-- 4. Stock purchase above stock_cash_pct of free cash (cash − obligations due
--    within 30 days − reserve) needs a reason ('stock_cap').
-- Expenses written by the app's own functions (paying an obligation) are not
-- checked: the obligation was already planned.

alter table public.cash_settings
  add column capital_floor_pct integer not null default 80 check (capital_floor_pct between 0 and 100),
  add column ad_budget_cents bigint not null default 200000 check (ad_budget_cents >= 0),
  add column ad_budget_revenue_pct integer not null default 30 check (ad_budget_revenue_pct between 0 and 100),
  add column stock_cash_pct integer not null default 50 check (stock_cash_pct between 0 and 100);
grant update (capital_floor_pct, ad_budget_cents, ad_budget_revenue_pct, stock_cash_pct) on public.cash_settings to authenticated;

alter table public.expenses
  add column guard_flags text[] not null default '{}',
  add column guard_reason text not null default '' check (char_length(guard_reason) <= 500);

-- ---------------------------------------------------------------------------
-- Money position: the numbers every guardrail reads. Same cash definition as
-- safe_withdrawal (counted from the opening date).
-- ---------------------------------------------------------------------------
create function app.money_position(p_organization_id uuid)
returns table (
  configured boolean, cash_cents bigint, due_30d_cents bigint, reserve_cents bigint, free_cents bigint,
  capital_cents bigint, stock_value_cents bigint, receivable_cents bigint, business_value_cents bigint,
  floor_pct integer, floor_cents bigint, below_floor boolean
)
language plpgsql stable security definer set search_path = '' as $$
declare
  tz constant text := 'Africa/Casablanca';
  v_today date := (now() at time zone tz)::date;
  v_settings public.cash_settings;
  v_entries bigint; v_withdrawn bigint; v_payouts bigint; v_expenses bigint;
begin
  select * into v_settings from public.cash_settings where organization_id = p_organization_id;
  if not found then
    return query select false, 0::bigint, 0::bigint, 0::bigint, 0::bigint, 0::bigint, 0::bigint, 0::bigint, 0::bigint, 0, 0::bigint, false;
    return;
  end if;
  select coalesce(sum(amount_cents) filter (where kind <> 'owner_withdrawal'), 0), coalesce(-sum(amount_cents) filter (where kind = 'owner_withdrawal'), 0)
  into v_entries, v_withdrawn
  from public.cash_entries where organization_id = p_organization_id and entry_date >= v_settings.opening_date;
  select coalesce(sum(net_received_cents), 0) into v_payouts
  from public.cod_remittances where organization_id = p_organization_id and received_on >= v_settings.opening_date;
  select coalesce(sum(amount_cents), 0) into v_expenses
  from public.expenses where organization_id = p_organization_id and incurred_on >= v_settings.opening_date;

  configured := true;
  cash_cents := v_entries + v_payouts - v_expenses - v_withdrawn;
  select coalesce(sum(amount_cents), 0) into due_30d_cents
  from public.payables where organization_id = p_organization_id and paid_on is null and due_on <= v_today + 30;
  reserve_cents := v_settings.reserve_floor_cents;
  free_cents := cash_cents - due_30d_cents - reserve_cents;
  select coalesce(sum(amount_cents), 0) into capital_cents
  from public.cash_entries where organization_id = p_organization_id and kind in ('opening', 'capital_in');
  select coalesce(sum(l.on_hand * v.cost_cents), 0) into stock_value_cents
  from public.inventory_levels l join public.product_variants v on v.id = l.variant_id
  where v.organization_id = p_organization_id and v.cost_cents is not null;
  select coalesce(sum(cod_amount_cents), 0) into receivable_cents
  from public.orders where organization_id = p_organization_id and payment_status = 'awaiting_remittance';
  business_value_cents := cash_cents + stock_value_cents + receivable_cents;
  floor_pct := v_settings.capital_floor_pct;
  floor_cents := (capital_cents * v_settings.capital_floor_pct) / 100;
  below_floor := capital_cents > 0 and v_settings.capital_floor_pct > 0 and business_value_cents < floor_cents;
  return next;
end;
$$;
revoke execute on function app.money_position(uuid) from public, anon, authenticated;

-- Readable summary for the pay page and the alerts.
create function public.capital_status(p_organization_id uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v record;
begin
  perform app.require_role(p_organization_id, array['owner', 'admin', 'finance']::public.member_role[]);
  select * into v from app.money_position(p_organization_id);
  return jsonb_build_object(
    'configured', v.configured, 'cash_cents', v.cash_cents, 'reserve_cents', v.reserve_cents, 'free_cents', v.free_cents,
    'capital_cents', v.capital_cents, 'stock_value_cents', v.stock_value_cents, 'receivable_cents', v.receivable_cents,
    'business_value_cents', v.business_value_cents, 'floor_pct', v.floor_pct, 'floor_cents', v.floor_cents, 'below_floor', v.below_floor
  );
end;
$$;
revoke execute on function public.capital_status(uuid) from public, anon;
grant execute on function public.capital_status(uuid) to authenticated;

-- Ad budget for the month of a day: a share of last month's delivered revenue, or the fixed amount.
create function app.ad_budget(p_organization_id uuid, p_day date) returns bigint
language sql stable security definer set search_path = '' as $$
  with s as (select * from public.cash_settings where organization_id = p_organization_id),
  prev as (
    select coalesce(sum(o.subtotal_cents - o.discount_cents + o.shipping_fee_cents), 0) as revenue
    from public.orders o
    where o.organization_id = p_organization_id
      and o.status in ('delivered', 'returned', 'exchange_requested')
      and (o.delivered_at at time zone 'Africa/Casablanca')::date >= (date_trunc('month', p_day) - interval '1 month')::date
      and (o.delivered_at at time zone 'Africa/Casablanca')::date < date_trunc('month', p_day)::date
  )
  select case when prev.revenue > 0 then (prev.revenue * s.ad_budget_revenue_pct) / 100 else s.ad_budget_cents end
  from s, prev;
$$;
revoke execute on function app.ad_budget(uuid, date) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Expense guard (direct inserts from the app's screens only)
-- ---------------------------------------------------------------------------
-- Which guardrails a new expense would cross (empty for non-members, so it reveals nothing).
create function app.expense_guard_flags(p_organization_id uuid, p_category public.expense_category, p_amount_cents bigint, p_day date) returns text[]
language plpgsql stable security definer set search_path = '' as $$
declare
  v record;
  v_flags text[] := '{}';
  v_month_ads bigint;
  v_stock_pct integer;
begin
  if not app.has_role(p_organization_id, '{owner,admin,finance}') then
    return '{}';
  end if;
  select * into v from app.money_position(p_organization_id);
  if not v.configured then
    return '{}';
  end if;
  if v.cash_cents - p_amount_cents < v.reserve_cents then
    v_flags := v_flags || 'reserve'::text;
  end if;
  if p_category = 'advertising' then
    select coalesce(sum(amount_cents), 0) into v_month_ads
    from public.expenses
    where organization_id = p_organization_id and category = 'advertising'
      and incurred_on >= date_trunc('month', p_day)::date
      and incurred_on < (date_trunc('month', p_day) + interval '1 month')::date;
    if v_month_ads + p_amount_cents > app.ad_budget(p_organization_id, p_day) then
      v_flags := v_flags || 'ad_budget'::text;
    end if;
  end if;
  if p_category = 'inventory_purchase' then
    select stock_cash_pct into v_stock_pct from public.cash_settings where organization_id = p_organization_id;
    if p_amount_cents > (greatest(v.free_cents, 0) * v_stock_pct) / 100 then
      v_flags := v_flags || 'stock_cap'::text;
    end if;
  end if;
  return v_flags;
end;
$$;
revoke execute on function app.expense_guard_flags(uuid, public.expense_category, bigint, date) from public, anon;
grant execute on function app.expense_guard_flags(uuid, public.expense_category, bigint, date) to authenticated;

-- Runs as the caller, so it can tell a screen's insert (role authenticated)
-- from an insert made inside one of the app's functions (their owner).
create function app.guard_expense() returns trigger
language plpgsql set search_path = '' as $$
declare
  v_flags text[];
begin
  if current_user <> 'authenticated' then
    new.guard_flags := '{}';
    return new;
  end if;
  v_flags := app.expense_guard_flags(new.organization_id, new.category, new.amount_cents, new.incurred_on);
  if cardinality(v_flags) > 0 and char_length(btrim(coalesce(new.guard_reason, ''))) < 10 then
    raise exception 'GUARD_REASON_REQUIRED' using errcode = 'P0001', detail = array_to_string(v_flags, ',');
  end if;
  new.guard_flags := v_flags;
  new.guard_reason := case when cardinality(v_flags) > 0 then btrim(new.guard_reason) else '' end;
  return new;
end;
$$;
create trigger guard_expense before insert on public.expenses for each row execute function app.guard_expense();

-- ---------------------------------------------------------------------------
-- Owner withdrawal: capital floor and reserve are hard limits.
-- ---------------------------------------------------------------------------
create or replace function public.record_owner_withdrawal(p_organization_id uuid, p_amount_cents bigint, p_date date, p_note text) returns public.cash_entries
language plpgsql security definer set search_path = '' as $$
declare
  v_safe bigint;
  v_entry public.cash_entries;
  v_over boolean;
  v record;
begin
  perform app.require_role(p_organization_id, array['owner', 'admin']::public.member_role[]);
  if p_amount_cents is null or p_amount_cents <= 0 then
    raise exception 'AMOUNT_REQUIRED' using errcode = 'P0001';
  end if;
  if p_date is null or p_date > (now() at time zone 'Africa/Casablanca')::date then
    raise exception 'INVALID_DATE' using errcode = 'P0001';
  end if;
  select * into v from app.money_position(p_organization_id);
  if v.below_floor then
    raise exception 'CAPITAL_BELOW_FLOOR' using errcode = 'P0001', detail = v.floor_cents::text;
  end if;
  if v.configured and v.cash_cents - p_amount_cents < v.reserve_cents then
    raise exception 'RESERVE_PROTECTED' using errcode = 'P0001', detail = greatest(v.cash_cents - v.reserve_cents, 0)::text;
  end if;
  v_safe := coalesce((public.safe_withdrawal(p_organization_id) ->> 'safe_cents')::bigint, 0);
  v_over := p_amount_cents > v_safe;
  if v_over and char_length(btrim(coalesce(p_note, ''))) < 10 then
    raise exception 'OVER_SAFE_LIMIT' using errcode = 'P0001', detail = v_safe::text;
  end if;
  insert into public.cash_entries (organization_id, kind, amount_cents, entry_date, note, over_limit)
  values (p_organization_id, 'owner_withdrawal', -p_amount_cents, p_date, coalesce(btrim(p_note), ''), v_over)
  returning * into v_entry;
  return v_entry;
end;
$$;
