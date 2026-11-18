-- Merchant OS — remembered carrier district per city (1.7.0)
-- When a parcel is created by hand for an order with a referenced city, the
-- carrier district chosen is remembered for that city. Automatic sending on
-- confirmation uses it, so it never guesses a district.

create table public.carrier_city_districts (
  provider_id uuid not null references public.shipping_providers (id) on delete cascade,
  city_id integer not null references public.cities (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  district_id text not null check (district_id ~ '^\d{1,10}$'),
  district_name text not null default '' check (char_length(district_name) <= 160),
  updated_at timestamptz not null default now(),
  primary key (provider_id, city_id),
  foreign key (provider_id, organization_id) references public.shipping_providers (id, organization_id)
);
create index carrier_city_districts_org_idx on public.carrier_city_districts (organization_id);

revoke all on public.carrier_city_districts from anon, authenticated;
grant select, insert, update, delete on public.carrier_city_districts to authenticated;
alter table public.carrier_city_districts enable row level security;
create policy ccd_select on public.carrier_city_districts for select to authenticated using (app.is_member(organization_id));
create policy ccd_write on public.carrier_city_districts for insert to authenticated
  with check (app.has_role(organization_id, '{owner,admin,operator,warehouse}'));
create policy ccd_update on public.carrier_city_districts for update to authenticated
  using (app.has_role(organization_id, '{owner,admin,operator,warehouse}')) with check (app.has_role(organization_id, '{owner,admin,operator,warehouse}'));
create policy ccd_delete on public.carrier_city_districts for delete to authenticated using (app.has_role(organization_id, '{owner,admin}'));
create trigger guard_tenant before update on public.carrier_city_districts for each row execute function app.guard_tenant_row();
