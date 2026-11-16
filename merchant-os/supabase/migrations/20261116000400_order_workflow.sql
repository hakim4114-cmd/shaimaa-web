-- Merchant OS — order workflow for Moroccan COD (0.3.0)
-- Cities reference and shipping rates, confirmation calls, customer
-- blocklist and history, editing orders before confirmation.
-- See docs/BUSINESS_RULES.md → "Order intake and confirmation".

-- ---------------------------------------------------------------------------
-- Cities: a shared reference list (organization_id NULL) that each
-- organization can extend with its own entries.
-- ---------------------------------------------------------------------------
create table public.cities (
  id integer generated always as identity primary key,
  organization_id uuid references public.organizations (id) on delete cascade,
  name_fr text not null check (char_length(btrim(name_fr)) between 2 and 80),
  name_ar text not null check (char_length(btrim(name_ar)) between 2 and 80),
  region text not null default '' check (char_length(region) <= 80),
  -- Lower-case alternative spellings used for matching typed input.
  aliases text[] not null default '{}' check (cardinality(aliases) <= 20),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create unique index cities_name_uq on public.cities (coalesce(organization_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(name_fr));
create index cities_org_idx on public.cities (organization_id);

insert into public.cities (name_fr, name_ar, region, aliases) values
  ('Casablanca', 'الدار البيضاء', 'Casablanca-Settat', '{casa,"dar bida",كازا,الدارالبيضاء}'),
  ('Mohammedia', 'المحمدية', 'Casablanca-Settat', '{mohamedia}'),
  ('El Jadida', 'الجديدة', 'Casablanca-Settat', '{jadida,eljadida}'),
  ('Settat', 'سطات', 'Casablanca-Settat', '{}'),
  ('Berrechid', 'برشيد', 'Casablanca-Settat', '{berchid}'),
  ('Rabat', 'الرباط', 'Rabat-Salé-Kénitra', '{}'),
  ('Salé', 'سلا', 'Rabat-Salé-Kénitra', '{sale,sla}'),
  ('Témara', 'تمارة', 'Rabat-Salé-Kénitra', '{temara}'),
  ('Kénitra', 'القنيطرة', 'Rabat-Salé-Kénitra', '{kenitra}'),
  ('Khémisset', 'الخميسات', 'Rabat-Salé-Kénitra', '{khemisset}'),
  ('Fès', 'فاس', 'Fès-Meknès', '{fes,fez}'),
  ('Meknès', 'مكناس', 'Fès-Meknès', '{meknes}'),
  ('Taza', 'تازة', 'Fès-Meknès', '{}'),
  ('Ifrane', 'إفران', 'Fès-Meknès', '{}'),
  ('Tanger', 'طنجة', 'Tanger-Tétouan-Al Hoceïma', '{tangier,tanja,طنجه}'),
  ('Tétouan', 'تطوان', 'Tanger-Tétouan-Al Hoceïma', '{tetouan,tetuan}'),
  ('Al Hoceïma', 'الحسيمة', 'Tanger-Tétouan-Al Hoceïma', '{"al hoceima",alhoceima,hoceima}'),
  ('Larache', 'العرائش', 'Tanger-Tétouan-Al Hoceïma', '{}'),
  ('Ksar El Kébir', 'القصر الكبير', 'Tanger-Tétouan-Al Hoceïma', '{"ksar el kebir","ksar kbir"}'),
  ('Chefchaouen', 'شفشاون', 'Tanger-Tétouan-Al Hoceïma', '{chaouen}'),
  ('Oujda', 'وجدة', 'Oriental', '{}'),
  ('Nador', 'الناظور', 'Oriental', '{}'),
  ('Berkane', 'بركان', 'Oriental', '{}'),
  ('Marrakech', 'مراكش', 'Marrakech-Safi', '{marrakesh,marakech}'),
  ('Safi', 'آسفي', 'Marrakech-Safi', '{asfi}'),
  ('Essaouira', 'الصويرة', 'Marrakech-Safi', '{souira}'),
  ('El Kelaâ des Sraghna', 'قلعة السراغنة', 'Marrakech-Safi', '{"kelaa des sraghna","kalaat sraghna"}'),
  ('Béni Mellal', 'بني ملال', 'Béni Mellal-Khénifra', '{"beni mellal"}'),
  ('Khouribga', 'خريبكة', 'Béni Mellal-Khénifra', '{}'),
  ('Khénifra', 'خنيفرة', 'Béni Mellal-Khénifra', '{khenifra}'),
  ('Fquih Ben Salah', 'الفقيه بن صالح', 'Béni Mellal-Khénifra', '{"fkih ben salah"}'),
  ('Agadir', 'أكادير', 'Souss-Massa', '{}'),
  ('Inezgane', 'إنزكان', 'Souss-Massa', '{}'),
  ('Taroudant', 'تارودانت', 'Souss-Massa', '{}'),
  ('Tiznit', 'تيزنيت', 'Souss-Massa', '{}'),
  ('Ouarzazate', 'ورزازات', 'Drâa-Tafilalet', '{}'),
  ('Errachidia', 'الرشيدية', 'Drâa-Tafilalet', '{rachidia}'),
  ('Guelmim', 'كلميم', 'Guelmim-Oued Noun', '{}'),
  ('Laâyoune', 'العيون', 'Laâyoune-Sakia El Hamra', '{laayoune}'),
  ('Dakhla', 'الداخلة', 'Dakhla-Oued Ed-Dahab', '{}');

-- Shipping fee charged to the customer and cost charged by the carrier,
-- per city. provider_id NULL = the organization's default rate.
create table public.shipping_rates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  provider_id uuid,
  city_id integer not null references public.cities (id),
  customer_fee_cents bigint not null default 0 check (customer_fee_cents >= 0),
  carrier_cost_cents bigint check (carrier_cost_cents is null or carrier_cost_cents >= 0),
  return_fee_cents bigint check (return_fee_cents is null or return_fee_cents >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (provider_id, organization_id) references public.shipping_providers (id, organization_id) on delete cascade deferrable
);
create unique index shipping_rates_uq on public.shipping_rates (organization_id, provider_id, city_id) nulls not distinct;

alter table public.orders add column city_id integer references public.cities (id);
create index orders_city_idx on public.orders (organization_id, city_id);

-- ---------------------------------------------------------------------------
-- Confirmation calls
-- ---------------------------------------------------------------------------
create type public.call_outcome as enum (
  'confirmed', 'cancelled', 'no_answer', 'busy', 'unreachable', 'wrong_number', 'call_back_requested', 'other'
);

create table public.order_call_attempts (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  order_id uuid not null,
  outcome public.call_outcome not null,
  note text check (char_length(note) <= 1000),
  call_back_at timestamptz,
  actor_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  foreign key (order_id, organization_id) references public.orders (id, organization_id) on delete cascade deferrable
);
create index order_call_attempts_order_idx on public.order_call_attempts (order_id, created_at);

alter table public.orders
  add column call_attempts integer not null default 0 check (call_attempts >= 0),
  add column last_call_outcome public.call_outcome,
  add column next_call_at timestamptz;
create index orders_next_call_idx on public.orders (organization_id, next_call_at) where next_call_at is not null;

alter table public.order_events drop constraint order_events_event_type_check;
alter table public.order_events add constraint order_events_event_type_check
  check (event_type in ('created', 'status_changed', 'note', 'shipment', 'payment', 'return', 'call', 'edited'));

-- ---------------------------------------------------------------------------
-- Blocklist
-- ---------------------------------------------------------------------------
create table public.customer_blocklist (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  phone text not null check (phone ~ '^\+212[5-7][0-9]{8}$'),
  reason text not null check (char_length(btrim(reason)) between 2 and 500),
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  unique (organization_id, phone)
);

create trigger touch_updated_at before update on public.shipping_rates for each row execute function app.touch_updated_at();
create trigger guard_tenant before update on public.shipping_rates for each row execute function app.guard_tenant_row();
create trigger guard_tenant before update on public.customer_blocklist for each row execute function app.guard_tenant_row();
create trigger stamp_created_by before insert on public.customer_blocklist for each row execute function app.stamp_created_by();
create trigger immutable before update or delete on public.order_call_attempts for each row execute function app.prevent_mutation();
create trigger audit after insert or update or delete on public.customer_blocklist for each row execute function app.write_audit_log();
create trigger audit after insert or update or delete on public.shipping_rates for each row execute function app.write_audit_log();

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

-- Replaces an order's lines with catalog-priced items; returns the subtotal.
create function app.write_order_items(p_order public.orders, p_items jsonb) returns bigint
language plpgsql security definer set search_path = '' as $$
declare
  v_item jsonb;
  v_variant record;
  v_qty integer;
  v_subtotal bigint := 0;
begin
  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'ORDER_ITEMS_REQUIRED' using errcode = 'P0001';
  end if;
  if jsonb_array_length(p_items) > 50 then
    raise exception 'TOO_MANY_ITEMS' using errcode = 'P0001';
  end if;

  delete from public.order_items where order_id = p_order.id;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := (v_item ->> 'quantity')::integer;
    if v_qty is null or v_qty < 1 then
      raise exception 'INVALID_QUANTITY' using errcode = 'P0001';
    end if;

    select v.id, v.sku, v.title, v.price_cents, v.cost_cents, p.name as product_name
    into v_variant
    from public.product_variants v
    join public.products p on p.id = v.product_id
    where v.id = (v_item ->> 'variant_id')::uuid
      and v.organization_id = p_order.organization_id
      and v.status = 'active'
      and p.status = 'active';
    if not found then
      raise exception 'VARIANT_NOT_AVAILABLE' using errcode = 'P0001', detail = v_item ->> 'variant_id';
    end if;

    insert into public.order_items (
      organization_id, order_id, variant_id, product_name, variant_title, sku, quantity, unit_price_cents, unit_cost_cents
    ) values (
      p_order.organization_id, p_order.id, v_variant.id, v_variant.product_name, v_variant.title, v_variant.sku,
      v_qty, v_variant.price_cents, v_variant.cost_cents
    );
    v_subtotal := v_subtotal + v_qty * v_variant.price_cents;
  end loop;
  return v_subtotal;
end;
$$;

-- Resolves a city id visible to the organization (shared or its own).
create function app.resolve_city(p_organization_id uuid, p_city_id integer) returns public.cities
language plpgsql stable security definer set search_path = '' as $$
declare
  v_city public.cities;
begin
  if p_city_id is null then
    return null;
  end if;
  select * into v_city from public.cities c
  where c.id = p_city_id and (c.organization_id is null or c.organization_id = p_organization_id);
  if not found then
    raise exception 'CITY_NOT_FOUND' using errcode = 'P0002';
  end if;
  return v_city;
end;
$$;

create function app.default_shipping_fee(p_organization_id uuid, p_city_id integer) returns bigint
language sql stable security definer set search_path = '' as $$
  select r.customer_fee_cents from public.shipping_rates r
  where r.organization_id = p_organization_id and r.city_id = p_city_id and r.provider_id is null;
$$;

-- ---------------------------------------------------------------------------
-- create_order v2: city reference, default shipping fee, blocklist
-- Payload additions: "city_id", "allow_blocked" (owner/admin only).
-- ---------------------------------------------------------------------------
create or replace function public.create_order(p_organization_id uuid, p_payload jsonb) returns public.orders
language plpgsql security definer set search_path = '' as $$
declare
  v_customer jsonb := coalesce(p_payload -> 'customer', '{}'::jsonb);
  v_phone text := btrim(coalesce(v_customer ->> 'phone', ''));
  v_city public.cities;
  v_city_name text;
  v_customer_id uuid;
  v_location_id uuid;
  v_order public.orders;
  v_subtotal bigint;
  v_discount bigint := coalesce((p_payload ->> 'discount_cents')::bigint, 0);
  v_shipping bigint;
  v_total bigint;
  v_cod bigint;
begin
  perform app.require_role(p_organization_id, array['owner', 'admin', 'operator']::public.member_role[]);

  -- Validate the cheap things before writing anything.
  if jsonb_typeof(p_payload -> 'items') is distinct from 'array' or jsonb_array_length(p_payload -> 'items') = 0 then
    raise exception 'ORDER_ITEMS_REQUIRED' using errcode = 'P0001';
  end if;

  if exists (select 1 from public.customer_blocklist b where b.organization_id = p_organization_id and b.phone = v_phone) then
    if not (coalesce((p_payload ->> 'allow_blocked')::boolean, false)
            and app.has_role(p_organization_id, array['owner', 'admin']::public.member_role[])) then
      raise exception 'CUSTOMER_BLOCKED' using errcode = 'P0001';
    end if;
  end if;

  v_city := app.resolve_city(p_organization_id, (p_payload ->> 'city_id')::integer);
  v_city_name := coalesce(v_city.name_fr, btrim(coalesce(v_customer ->> 'city', '')));
  v_shipping := coalesce((p_payload ->> 'shipping_fee_cents')::bigint, app.default_shipping_fee(p_organization_id, v_city.id), 0);

  v_location_id := coalesce(
    (p_payload ->> 'location_id')::uuid,
    (select l.id from public.inventory_locations l where l.organization_id = p_organization_id and l.is_default)
  );
  if v_location_id is null then
    raise exception 'LOCATION_REQUIRED' using errcode = 'P0001';
  end if;

  insert into public.customers as c (organization_id, full_name, phone, city, address)
  values (
    p_organization_id, btrim(coalesce(v_customer ->> 'full_name', '')), v_phone, v_city_name,
    btrim(coalesce(v_customer ->> 'address', ''))
  )
  on conflict (organization_id, phone) do update
    set full_name = excluded.full_name,
        city = case when excluded.city <> '' then excluded.city else c.city end,
        address = case when excluded.address <> '' then excluded.address else c.address end
  returning id into v_customer_id;

  insert into public.orders (
    organization_id, store_id, order_number, customer_id, location_id, source, campaign_id,
    city, city_id, notes, internal_notes, created_by
  ) values (
    p_organization_id,
    (p_payload ->> 'store_id')::uuid,
    (select o.order_prefix from public.organizations o where o.id = p_organization_id)
      || '-' || lpad(app.next_counter(p_organization_id, 'order_number')::text, 6, '0'),
    v_customer_id, v_location_id,
    coalesce((p_payload ->> 'source')::public.order_source, 'other'),
    (p_payload ->> 'campaign_id')::uuid,
    v_city_name, v_city.id,
    coalesce(p_payload ->> 'notes', ''),
    coalesce(p_payload ->> 'internal_notes', ''),
    auth.uid()
  ) returning * into v_order;

  insert into public.order_contacts (order_id, organization_id, full_name, phone, address)
  select v_order.id, p_organization_id, c.full_name, c.phone, c.address from public.customers c where c.id = v_customer_id;

  v_subtotal := app.write_order_items(v_order, p_payload -> 'items');

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

-- ---------------------------------------------------------------------------
-- Editing before confirmation (stock is not reserved yet, so lines can be
-- replaced freely). Payload keys, all optional: "items", "discount_cents",
-- "shipping_fee_cents", "cod_amount_cents", "city_id", "city", "address",
-- "full_name", "notes", "internal_notes".
-- ---------------------------------------------------------------------------
create function public.update_order_details(p_order_id uuid, p_payload jsonb) returns public.orders
language plpgsql security definer set search_path = '' as $$
declare
  v_order public.orders;
  v_city public.cities;
  v_city_name text;
  v_subtotal bigint;
  v_discount bigint;
  v_shipping bigint;
  v_total bigint;
  v_cod bigint;
  v_changes text[] := '{}';
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'ORDER_NOT_FOUND' using errcode = 'P0002';
  end if;
  perform app.require_role(v_order.organization_id, array['owner', 'admin', 'operator']::public.member_role[]);
  if v_order.status not in ('new', 'confirmation_pending') then
    raise exception 'ORDER_LOCKED' using errcode = 'P0001';
  end if;

  if p_payload ? 'items' then
    v_subtotal := app.write_order_items(v_order, p_payload -> 'items');
    v_changes := array_append(v_changes, 'items');
  else
    v_subtotal := v_order.subtotal_cents;
  end if;

  v_city_name := v_order.city;
  if p_payload ? 'city_id' then
    v_city := app.resolve_city(v_order.organization_id, (p_payload ->> 'city_id')::integer);
    v_city_name := coalesce(v_city.name_fr, v_city_name);
    v_changes := array_append(v_changes, 'city');
  elsif p_payload ? 'city' then
    v_city_name := btrim(p_payload ->> 'city');
    v_changes := array_append(v_changes, 'city');
  end if;

  v_discount := coalesce((p_payload ->> 'discount_cents')::bigint, v_order.discount_cents);
  v_shipping := coalesce(
    (p_payload ->> 'shipping_fee_cents')::bigint,
    case when p_payload ? 'city_id' then app.default_shipping_fee(v_order.organization_id, v_city.id) end,
    v_order.shipping_fee_cents
  );
  if v_discount < 0 or v_discount > v_subtotal then
    raise exception 'INVALID_DISCOUNT' using errcode = 'P0001';
  end if;
  if v_shipping < 0 then
    raise exception 'INVALID_SHIPPING_FEE' using errcode = 'P0001';
  end if;
  v_total := v_subtotal - v_discount + v_shipping;
  -- COD follows the total unless set explicitly, or unless it was a deposit before.
  v_cod := coalesce(
    (p_payload ->> 'cod_amount_cents')::bigint,
    case when v_order.cod_amount_cents = v_order.total_cents then v_total else least(v_order.cod_amount_cents, v_total) end
  );
  if v_cod < 0 or v_cod > v_total then
    raise exception 'INVALID_COD_AMOUNT' using errcode = 'P0001';
  end if;
  if v_discount <> v_order.discount_cents then v_changes := array_append(v_changes, 'discount'); end if;
  if v_shipping <> v_order.shipping_fee_cents then v_changes := array_append(v_changes, 'shipping_fee'); end if;

  update public.orders
  set subtotal_cents = v_subtotal, discount_cents = v_discount, shipping_fee_cents = v_shipping,
      total_cents = v_total, cod_amount_cents = v_cod,
      city = v_city_name,
      city_id = case when p_payload ? 'city_id' then v_city.id when p_payload ? 'city' then null else city_id end,
      notes = coalesce(p_payload ->> 'notes', notes),
      internal_notes = coalesce(p_payload ->> 'internal_notes', internal_notes)
  where id = v_order.id
  returning * into v_order;

  if p_payload ? 'address' or p_payload ? 'full_name' then
    update public.order_contacts
    set address = coalesce(btrim(p_payload ->> 'address'), address),
        full_name = coalesce(nullif(btrim(p_payload ->> 'full_name'), ''), full_name)
    where order_id = v_order.id;
    v_changes := array_append(v_changes, 'contact');
  end if;

  if cardinality(v_changes) > 0 then
    perform app.add_order_event(v_order, 'edited', null, null, array_to_string(v_changes, ', '));
  end if;
  return v_order;
end;
$$;

-- ---------------------------------------------------------------------------
-- Confirmation calls: one call per row; "confirmed" and "cancelled" move the
-- order through the normal workflow (stock reservation included).
-- ---------------------------------------------------------------------------
create function public.log_call_attempt(
  p_order_id uuid,
  p_outcome public.call_outcome,
  p_note text default null,
  p_call_back_at timestamptz default null
) returns public.orders
language plpgsql security definer set search_path = '' as $$
declare
  v_order public.orders;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'ORDER_NOT_FOUND' using errcode = 'P0002';
  end if;
  perform app.require_role(v_order.organization_id, array['owner', 'admin', 'operator']::public.member_role[]);
  if v_order.status not in ('new', 'confirmation_pending') then
    raise exception 'ORDER_NOT_AWAITING_CONFIRMATION' using errcode = 'P0001';
  end if;
  if p_outcome = 'call_back_requested' and p_call_back_at is null then
    raise exception 'CALL_BACK_TIME_REQUIRED' using errcode = 'P0001';
  end if;
  if p_outcome = 'cancelled' and coalesce(btrim(p_note), '') = '' then
    raise exception 'NOTE_REQUIRED' using errcode = 'P0001';
  end if;

  insert into public.order_call_attempts (organization_id, order_id, outcome, note, call_back_at, actor_id)
  values (v_order.organization_id, v_order.id, p_outcome, nullif(btrim(p_note), ''), p_call_back_at, auth.uid());

  update public.orders
  set call_attempts = call_attempts + 1,
      last_call_outcome = p_outcome,
      next_call_at = case when p_outcome = 'call_back_requested' then p_call_back_at
                          when p_outcome in ('confirmed', 'cancelled') then null
                          else next_call_at end
  where id = v_order.id
  returning * into v_order;

  perform app.add_order_event(v_order, 'call', null, null,
    p_outcome::text || coalesce(': ' || nullif(btrim(p_note), ''), ''));

  if p_outcome = 'confirmed' then
    v_order := app.apply_order_transition(v_order.id, 'confirmed', p_note);
  elsif p_outcome = 'cancelled' then
    v_order := app.apply_order_transition(v_order.id, 'cancelled', p_note);
  elsif v_order.status = 'new' then
    v_order := app.apply_order_transition(v_order.id, 'confirmation_pending', null);
  end if;
  return v_order;
end;
$$;

-- Delivery history for a phone number, shown at order entry.
create function public.customer_history(p_organization_id uuid, p_phone text)
returns table (orders_total integer, delivered integer, refused integer, returned integer, cancelled integer, blocked boolean, block_reason text)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform app.require_role(p_organization_id, array['owner', 'admin', 'operator']::public.member_role[]);
  return query
  select
    count(o.id)::integer,
    count(o.id) filter (where o.status in ('delivered', 'returned', 'exchange_requested'))::integer,
    count(o.id) filter (where o.status = 'refused')::integer,
    count(o.id) filter (where o.status = 'returned')::integer,
    count(o.id) filter (where o.status = 'cancelled')::integer,
    exists (select 1 from public.customer_blocklist b where b.organization_id = p_organization_id and b.phone = p_phone),
    (select b.reason from public.customer_blocklist b where b.organization_id = p_organization_id and b.phone = p_phone)
  from public.order_contacts c
  join public.orders o on o.id = c.order_id
  where c.organization_id = p_organization_id and c.phone = p_phone;
end;
$$;

-- ---------------------------------------------------------------------------
-- Privileges and RLS
-- ---------------------------------------------------------------------------
revoke all on public.cities, public.shipping_rates, public.order_call_attempts, public.customer_blocklist from anon, authenticated;
grant select on public.cities, public.shipping_rates, public.order_call_attempts, public.customer_blocklist to authenticated;
grant insert (organization_id, name_fr, name_ar, region, aliases), update (name_fr, name_ar, region, aliases, is_active) on public.cities to authenticated;
grant insert, update, delete on public.shipping_rates to authenticated;
grant insert, delete on public.customer_blocklist to authenticated;
grant update (reason) on public.customer_blocklist to authenticated;

alter table public.cities enable row level security;
alter table public.shipping_rates enable row level security;
alter table public.order_call_attempts enable row level security;
alter table public.customer_blocklist enable row level security;

create policy cities_select on public.cities for select to authenticated
  using (organization_id is null or app.is_member(organization_id));
create policy cities_insert on public.cities for insert to authenticated
  with check (organization_id is not null and app.has_role(organization_id, '{owner,admin,operator}'));
create policy cities_update on public.cities for update to authenticated
  using (organization_id is not null and app.has_role(organization_id, '{owner,admin}'))
  with check (organization_id is not null and app.has_role(organization_id, '{owner,admin}'));

create policy rates_select on public.shipping_rates for select to authenticated using (app.is_member(organization_id));
create policy rates_insert on public.shipping_rates for insert to authenticated with check (app.has_role(organization_id, '{owner,admin}'));
create policy rates_update on public.shipping_rates for update to authenticated
  using (app.has_role(organization_id, '{owner,admin}')) with check (app.has_role(organization_id, '{owner,admin}'));
create policy rates_delete on public.shipping_rates for delete to authenticated using (app.has_role(organization_id, '{owner,admin}'));

create policy calls_select on public.order_call_attempts for select to authenticated
  using (app.has_role(organization_id, '{owner,admin,operator}'));

create policy blocklist_select on public.customer_blocklist for select to authenticated
  using (app.has_role(organization_id, '{owner,admin,operator}'));
create policy blocklist_insert on public.customer_blocklist for insert to authenticated
  with check (app.has_role(organization_id, '{owner,admin,operator}'));
create policy blocklist_update on public.customer_blocklist for update to authenticated
  using (app.has_role(organization_id, '{owner,admin}')) with check (app.has_role(organization_id, '{owner,admin}'));
create policy blocklist_delete on public.customer_blocklist for delete to authenticated
  using (app.has_role(organization_id, '{owner,admin}'));

revoke execute on function app.write_order_items(public.orders, jsonb), app.resolve_city(uuid, integer),
  app.default_shipping_fee(uuid, integer) from public, anon, authenticated;
revoke execute on function public.update_order_details(uuid, jsonb), public.log_call_attempt(uuid, public.call_outcome, text, timestamptz),
  public.customer_history(uuid, text) from public, anon;
grant execute on function public.update_order_details(uuid, jsonb), public.log_call_attempt(uuid, public.call_outcome, text, timestamptz),
  public.customer_history(uuid, text) to authenticated;
-- create_order keeps its grants (create or replace preserves them).
