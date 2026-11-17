-- Merchant OS — cash position, obligations and safe owner pay (1.3.0)
--
-- Safe to withdraw today = least(
--   owner pay earned (owner-pay share of closed months) − already withdrawn,
--   cash balance − obligations due within 30 days − reserve floor
-- ), never below zero.
--
-- Cash balance = opening + capital put in + adjustments
--              + carrier payouts received − expenses − owner withdrawals,
-- counted from the opening date.

create table public.cash_settings (
  organization_id uuid primary key references public.organizations (id) on delete cascade,
  opening_date date not null default current_date,
  reserve_floor_cents bigint not null default 0 check (reserve_floor_cents >= 0),
  owner_fund_name text not null default '' check (char_length(owner_fund_name) <= 60),
  updated_at timestamptz not null default now()
);

create type public.cash_entry_kind as enum ('opening', 'capital_in', 'adjustment', 'owner_withdrawal');

create table public.cash_entries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  kind public.cash_entry_kind not null,
  -- Signed: money in > 0, money out < 0. Withdrawals are always negative.
  amount_cents bigint not null check (amount_cents <> 0),
  entry_date date not null,
  note text not null default '' check (char_length(note) <= 500),
  over_limit boolean not null default false,
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  check (kind <> 'owner_withdrawal' or amount_cents < 0),
  check (kind not in ('opening', 'capital_in') or amount_cents > 0)
);
create index cash_entries_org_idx on public.cash_entries (organization_id, entry_date);

create table public.payables (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  counterparty text not null check (char_length(btrim(counterparty)) between 1 and 120),
  description text not null default '' check (char_length(description) <= 500),
  category public.expense_category not null default 'other',
  amount_cents bigint not null check (amount_cents > 0),
  due_on date not null,
  paid_on date,
  expense_id uuid references public.expenses (id) on delete set null,
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);
create index payables_org_due_idx on public.payables (organization_id, due_on) where paid_on is null;

create trigger immutable before update or delete on public.cash_entries for each row execute function app.prevent_mutation();
create trigger audit after insert on public.cash_entries for each row execute function app.write_audit_log();
create trigger audit after insert or update or delete on public.payables for each row execute function app.write_audit_log();
create trigger audit after insert or update on public.cash_settings for each row execute function app.write_audit_log();
create trigger touch_updated_at before update on public.cash_settings for each row execute function app.touch_updated_at();

revoke all on public.cash_settings, public.cash_entries, public.payables from anon, authenticated;
grant select, insert on public.cash_settings, public.cash_entries, public.payables to authenticated;
grant update (opening_date, reserve_floor_cents, owner_fund_name) on public.cash_settings to authenticated;
grant update (counterparty, description, category, amount_cents, due_on) on public.payables to authenticated;
grant delete on public.payables to authenticated;

alter table public.cash_settings enable row level security;
alter table public.cash_entries enable row level security;
alter table public.payables enable row level security;
create policy cash_settings_all on public.cash_settings for all to authenticated
  using (app.has_role(organization_id, '{owner,admin,finance}')) with check (app.has_role(organization_id, '{owner,admin}'));
-- Entries other than withdrawals are inserted directly; withdrawals go through record_owner_withdrawal.
create policy cash_entries_select on public.cash_entries for select to authenticated using (app.has_role(organization_id, '{owner,admin,finance}'));
create policy cash_entries_insert on public.cash_entries for insert to authenticated
  with check (app.has_role(organization_id, '{owner,admin}') and kind <> 'owner_withdrawal' and over_limit = false);
create policy payables_select on public.payables for select to authenticated using (app.has_role(organization_id, '{owner,admin,finance}'));
create policy payables_insert on public.payables for insert to authenticated with check (app.has_role(organization_id, '{owner,admin,finance}') and paid_on is null and expense_id is null);
create policy payables_update on public.payables for update to authenticated
  using (app.has_role(organization_id, '{owner,admin,finance}') and paid_on is null) with check (app.has_role(organization_id, '{owner,admin,finance}'));
create policy payables_delete on public.payables for delete to authenticated using (app.has_role(organization_id, '{owner,admin}') and paid_on is null);

-- ---------------------------------------------------------------------------
create function public.safe_withdrawal(p_organization_id uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  tz constant text := 'Africa/Casablanca';
  v_today date := (now() at time zone tz)::date;
  v_settings public.cash_settings;
  v_entries bigint; v_withdrawn bigint; v_payouts bigint; v_expenses bigint;
  v_balance bigint; v_due bigint; v_earned bigint; v_closed integer;
  v_pay_left bigint; v_free bigint; v_safe bigint; v_reason text;
begin
  perform app.require_role(p_organization_id, array['owner', 'admin', 'finance']::public.member_role[]);
  select * into v_settings from public.cash_settings where organization_id = p_organization_id;
  if not found then
    return jsonb_build_object('configured', false);
  end if;

  select coalesce(sum(amount_cents) filter (where kind <> 'owner_withdrawal'), 0), coalesce(-sum(amount_cents) filter (where kind = 'owner_withdrawal'), 0)
  into v_entries, v_withdrawn
  from public.cash_entries where organization_id = p_organization_id;
  select coalesce(sum(net_received_cents), 0) into v_payouts
  from public.cod_remittances where organization_id = p_organization_id and received_on >= v_settings.opening_date;
  select coalesce(sum(amount_cents), 0) into v_expenses
  from public.expenses where organization_id = p_organization_id and incurred_on >= v_settings.opening_date;
  v_balance := v_entries + v_payouts - v_expenses - v_withdrawn;

  select coalesce(sum(amount_cents), 0) into v_due
  from public.payables where organization_id = p_organization_id and paid_on is null and due_on <= v_today + 30;

  select count(*), coalesce(sum((a ->> 'cents')::bigint) filter (where lower(btrim(a ->> 'name')) = lower(btrim(v_settings.owner_fund_name)) and v_settings.owner_fund_name <> ''), 0)
  into v_closed, v_earned
  from public.monthly_closes c left join lateral jsonb_array_elements(c.allocations) a on true
  where c.organization_id = p_organization_id;
  select count(*) into v_closed from public.monthly_closes where organization_id = p_organization_id;

  v_pay_left := v_earned - v_withdrawn;
  v_free := v_balance - v_due - v_settings.reserve_floor_cents;
  v_safe := greatest(0, least(v_pay_left, v_free));
  v_reason := case
    when v_settings.owner_fund_name = '' then 'no_owner_fund'
    when v_closed = 0 then 'no_closed_month'
    when v_pay_left <= 0 then 'pay_not_earned'
    when v_free <= 0 then 'cash_tight'
    when v_free < v_pay_left then 'limited_by_cash'
    else 'ok' end;

  return jsonb_build_object(
    'configured', true,
    'safe_cents', v_safe,
    'reason', v_reason,
    'cash_balance_cents', v_balance,
    'obligations_30d_cents', v_due,
    'reserve_floor_cents', v_settings.reserve_floor_cents,
    'free_cash_cents', v_free,
    'pay_earned_cents', v_earned,
    'withdrawn_cents', v_withdrawn,
    'pay_left_cents', v_pay_left,
    'closed_months', v_closed,
    'opening_date', v_settings.opening_date,
    'owner_fund_name', v_settings.owner_fund_name
  );
end;
$$;

-- Withdrawal: allowed up to the safe amount; above it only with a written reason (flagged).
create function public.record_owner_withdrawal(p_organization_id uuid, p_amount_cents bigint, p_date date, p_note text) returns public.cash_entries
language plpgsql security definer set search_path = '' as $$
declare
  v_safe bigint;
  v_entry public.cash_entries;
  v_over boolean;
begin
  perform app.require_role(p_organization_id, array['owner', 'admin']::public.member_role[]);
  if p_amount_cents is null or p_amount_cents <= 0 then
    raise exception 'AMOUNT_REQUIRED' using errcode = 'P0001';
  end if;
  if p_date is null or p_date > (now() at time zone 'Africa/Casablanca')::date then
    raise exception 'INVALID_DATE' using errcode = 'P0001';
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

-- Paying an obligation records it as an expense (so it is counted once, in cash and in P&L when applicable).
create function public.pay_payable(p_payable_id uuid, p_paid_on date) returns public.payables
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
  return v_payable;
end;
$$;

revoke execute on function public.safe_withdrawal(uuid), public.record_owner_withdrawal(uuid, bigint, date, text), public.pay_payable(uuid, date) from public, anon;
grant execute on function public.safe_withdrawal(uuid), public.record_owner_withdrawal(uuid, bigint, date, text), public.pay_payable(uuid, date) to authenticated;
