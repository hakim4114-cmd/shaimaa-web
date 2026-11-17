-- Merchant OS — owner routines: weekly review and monthly close (1.0.0)
-- See docs/BUSINESS_RULES.md → Owner routines.

-- Decision of the week: what, why, which metric it should move; judged later.
create table public.owner_decisions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  week_start date not null,
  decision text not null check (char_length(btrim(decision)) between 2 and 1000),
  reason text not null default '' check (char_length(reason) <= 1000),
  metric text not null default '' check (char_length(metric) <= 200),
  outcome text check (outcome in ('worked', 'did_not_work', 'too_early')),
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (extract(isodow from week_start) = 1)
);
create index owner_decisions_org_idx on public.owner_decisions (organization_id, week_start desc);

-- Fund plan ("الصناديق"): percentages of monthly net profit, set once.
create table public.fund_plan (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 60),
  percent numeric(5, 2) not null check (percent > 0 and percent <= 100),
  position smallint not null default 0,
  created_at timestamptz not null default now(),
  unique (organization_id, name)
);

-- A confirmed monthly close: the month's net profit and the amounts set aside.
create table public.monthly_closes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  month date not null check (extract(day from month) = 1),
  net_profit_cents bigint not null,
  allocations jsonb not null default '[]' check (jsonb_typeof(allocations) = 'array'),
  note text not null default '' check (char_length(note) <= 1000),
  closed_by uuid references auth.users (id) on delete set null default auth.uid(),
  closed_at timestamptz not null default now(),
  unique (organization_id, month)
);

create trigger touch_updated_at before update on public.owner_decisions for each row execute function app.touch_updated_at();
create trigger guard_tenant before update on public.owner_decisions for each row execute function app.guard_tenant_row();
create trigger guard_tenant before update on public.fund_plan for each row execute function app.guard_tenant_row();
create trigger immutable before update or delete on public.monthly_closes for each row execute function app.prevent_mutation();
create trigger audit after insert or update or delete on public.owner_decisions for each row execute function app.write_audit_log();
create trigger audit after insert or update or delete on public.fund_plan for each row execute function app.write_audit_log();
create trigger audit after insert on public.monthly_closes for each row execute function app.write_audit_log();

revoke all on public.owner_decisions, public.fund_plan, public.monthly_closes from anon, authenticated;
grant select, insert, delete on public.owner_decisions, public.fund_plan to authenticated;
grant update (decision, reason, metric, outcome) on public.owner_decisions to authenticated;
grant update (name, percent, position) on public.fund_plan to authenticated;
grant select, insert on public.monthly_closes to authenticated;

alter table public.owner_decisions enable row level security;
alter table public.fund_plan enable row level security;
alter table public.monthly_closes enable row level security;

create policy decisions_all on public.owner_decisions for all to authenticated
  using (app.has_role(organization_id, '{owner,admin}')) with check (app.has_role(organization_id, '{owner,admin}'));
create policy fund_plan_all on public.fund_plan for all to authenticated
  using (app.has_role(organization_id, '{owner,admin,finance}')) with check (app.has_role(organization_id, '{owner,admin}'));
create policy closes_select on public.monthly_closes for select to authenticated
  using (app.has_role(organization_id, '{owner,admin,finance}'));
create policy closes_insert on public.monthly_closes for insert to authenticated
  with check (app.has_role(organization_id, '{owner,admin}'));

-- ---------------------------------------------------------------------------
-- Stock health: value at cost and last outbound movement per variant, for
-- the inventory value and the dormant stock report (30 / 60 / 90 days).
-- ---------------------------------------------------------------------------
create function public.stock_health(p_organization_id uuid)
returns table (variant_id uuid, sku text, product_name text, variant_title text, on_hand integer, cost_cents bigint, value_cents bigint, last_outbound_at timestamptz, first_receipt_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform app.require_role(p_organization_id, array['owner', 'admin', 'finance']::public.member_role[]);
  return query
  select v.id, v.sku, p.name, v.title,
         coalesce(sum(l.on_hand), 0)::integer,
         v.cost_cents,
         case when v.cost_cents is null then null else (coalesce(sum(l.on_hand), 0) * v.cost_cents)::bigint end,
         (select max(m.created_at) from public.inventory_movements m where m.variant_id = v.id and m.movement_type in ('shipment', 'write_off')),
         (select min(m.created_at) from public.inventory_movements m where m.variant_id = v.id and m.movement_type = 'receipt')
  from public.product_variants v
  join public.products p on p.id = v.product_id
  left join public.inventory_levels l on l.variant_id = v.id
  where v.organization_id = p_organization_id
  group by v.id, p.name
  having coalesce(sum(l.on_hand), 0) > 0
  order by 7 desc nulls last;
end;
$$;

revoke execute on function public.stock_health(uuid) from public, anon;
grant execute on function public.stock_health(uuid) to authenticated;
