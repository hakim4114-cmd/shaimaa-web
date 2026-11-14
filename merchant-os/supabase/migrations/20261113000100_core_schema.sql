-- Merchant OS — core schema (Phase 1)
-- Tenancy, catalog, inventory, customers, orders, shipping, COD, returns,
-- expenses, audit. See docs/DATABASE_SCHEMA.md and docs/BUSINESS_RULES.md.
--
-- Conventions
--   * Money is stored as integer minor units (santimat: 1 MAD = 100) in
--     *_cents bigint columns. Never floats.
--   * Every tenant table carries organization_id. Child rows reference
--     parents through composite (id, organization_id) foreign keys so a row
--     can never point at another tenant's data.
--   * State-changing business operations (stock, order status, shipments,
--     COD, returns) are SECURITY DEFINER functions in 20261113000200. Those
--     tables are read-only to the `authenticated` role.

create schema if not exists app;
revoke all on schema app from public;
grant usage on schema app to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.member_role as enum ('owner', 'admin', 'operator', 'warehouse', 'finance', 'viewer');
create type public.product_status as enum ('draft', 'active', 'archived');
create type public.order_status as enum (
  'new', 'confirmation_pending', 'confirmed', 'preparing', 'ready_to_ship', 'shipped', 'delivered',
  'cancelled', 'refused', 'returned', 'exchange_requested'
);
create type public.payment_status as enum ('unpaid', 'awaiting_remittance', 'settled');
create type public.stock_state as enum ('none', 'reserved', 'released', 'shipped');
create type public.order_source as enum ('website', 'whatsapp', 'instagram', 'facebook', 'tiktok', 'phone', 'store', 'other');
create type public.inventory_movement_type as enum (
  'receipt', 'adjustment', 'reservation', 'reservation_release', 'shipment',
  'return_receipt', 'restock', 'mark_damaged', 'write_off'
);
create type public.shipping_provider_kind as enum ('manual', 'csv', 'api');
create type public.shipment_status as enum (
  'pending', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered', 'failed_attempt', 'returned_to_sender', 'cancelled'
);
create type public.return_kind as enum ('refusal', 'return', 'exchange');
create type public.return_status as enum ('awaiting_receipt', 'received', 'inspected', 'closed');
create type public.item_condition as enum ('pending', 'resellable', 'damaged', 'missing');
create type public.expense_category as enum (
  'inventory_purchase', 'production', 'packaging', 'shipping', 'advertising', 'salaries', 'rent', 'software', 'other'
);
create type public.data_source as enum ('manual', 'import', 'api');
create type public.marketing_platform as enum ('meta', 'instagram', 'tiktok', 'whatsapp', 'google', 'website', 'other');

-- ---------------------------------------------------------------------------
-- Generic trigger functions
-- ---------------------------------------------------------------------------
create function app.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create function app.prevent_mutation() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  -- The only permitted removal is the cascade of a deleted organization.
  if tg_op = 'DELETE' and not exists (select 1 from public.organizations o where o.id = old.organization_id) then
    return old;
  end if;
  raise exception 'IMMUTABLE_RECORD' using errcode = 'P0001', detail = tg_table_name;
end;
$$;

-- ---------------------------------------------------------------------------
-- Tenancy
-- ---------------------------------------------------------------------------
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,46}[a-z0-9]$'),
  currency char(3) not null default 'MAD' check (currency = 'MAD'),
  country char(2) not null default 'MA',
  timezone text not null default 'Africa/Casablanca',
  order_prefix text not null default 'ORD' check (order_prefix ~ '^[A-Z0-9]{2,6}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organization_members (
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.member_role not null default 'viewer',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);
create index organization_members_user_idx on public.organization_members (user_id);

create table public.organization_counters (
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  value bigint not null default 0,
  primary key (organization_id, name)
);

create table public.stores (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id)
);

-- ---------------------------------------------------------------------------
-- Authorization helpers (used by RLS policies and business functions)
-- ---------------------------------------------------------------------------
create function app.is_member(p_organization_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.organization_members m
    where m.organization_id = p_organization_id and m.user_id = auth.uid()
  );
$$;

create function app.has_role(p_organization_id uuid, p_roles public.member_role[]) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.organization_members m
    where m.organization_id = p_organization_id and m.user_id = auth.uid() and m.role = any (p_roles)
  );
$$;

create function app.require_role(p_organization_id uuid, p_roles public.member_role[]) returns void
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null or not app.has_role(p_organization_id, p_roles) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Catalog
-- ---------------------------------------------------------------------------
create table public.product_categories (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  created_at timestamptz not null default now(),
  unique (id, organization_id)
);
create unique index product_categories_name_uq on public.product_categories (organization_id, lower(name));

create table public.products (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  category_id uuid,
  name text not null check (char_length(btrim(name)) between 1 and 160),
  description text not null default '' check (char_length(description) <= 5000),
  status public.product_status not null default 'draft',
  image_paths text[] not null default '{}' check (cardinality(image_paths) <= 12),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  foreign key (category_id, organization_id) references public.product_categories (id, organization_id) deferrable
);
create index products_org_status_idx on public.products (organization_id, status);

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  product_id uuid not null,
  sku text not null check (sku ~ '^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$'),
  barcode text check (barcode is null or barcode ~ '^[0-9A-Za-z-]{4,64}$'),
  title text not null default '' check (char_length(title) <= 120),
  option_values jsonb not null default '{}' check (jsonb_typeof(option_values) = 'object'),
  price_cents bigint not null check (price_cents >= 0),
  -- NULL means "cost unknown": finance reports flag it instead of assuming 0.
  cost_cents bigint check (cost_cents is null or cost_cents >= 0),
  min_stock_level integer not null default 0 check (min_stock_level >= 0),
  status public.product_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  unique (organization_id, sku),
  foreign key (product_id, organization_id) references public.products (id, organization_id) on delete cascade
);
create unique index product_variants_barcode_uq on public.product_variants (organization_id, barcode) where barcode is not null;
create index product_variants_product_idx on public.product_variants (product_id);

-- ---------------------------------------------------------------------------
-- Inventory
-- ---------------------------------------------------------------------------
create table public.inventory_locations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  unique (id, organization_id)
);
create unique index inventory_locations_default_uq on public.inventory_locations (organization_id) where is_default;

-- Current stock per variant and location. Only app.move_stock() writes here.
--   on_hand    physically present and sellable (includes reserved units)
--   reserved   committed to confirmed, not-yet-shipped orders
--   available  on_hand - reserved
--   damaged    quarantined, not sellable
--   inspection returned units awaiting a condition decision
create table public.inventory_levels (
  organization_id uuid not null references public.organizations (id) on delete cascade,
  variant_id uuid not null,
  location_id uuid not null,
  on_hand integer not null default 0 check (on_hand >= 0),
  reserved integer not null default 0 check (reserved >= 0),
  damaged integer not null default 0 check (damaged >= 0),
  inspection integer not null default 0 check (inspection >= 0),
  available integer generated always as (on_hand - reserved) stored,
  updated_at timestamptz not null default now(),
  primary key (variant_id, location_id),
  check (reserved <= on_hand),
  foreign key (variant_id, organization_id) references public.product_variants (id, organization_id) on delete cascade,
  foreign key (location_id, organization_id) references public.inventory_locations (id, organization_id) deferrable
);
create index inventory_levels_org_idx on public.inventory_levels (organization_id);

-- Append-only ledger. One row per atomic change; deltas per bucket.
create table public.inventory_movements (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  variant_id uuid not null,
  location_id uuid not null,
  movement_type public.inventory_movement_type not null,
  delta_on_hand integer not null default 0,
  delta_reserved integer not null default 0,
  delta_damaged integer not null default 0,
  delta_inspection integer not null default 0,
  reference_type text check (reference_type in ('order', 'return', 'manual')),
  reference_id uuid,
  note text check (char_length(note) <= 500),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  check (delta_on_hand <> 0 or delta_reserved <> 0 or delta_damaged <> 0 or delta_inspection <> 0),
  foreign key (variant_id, organization_id) references public.product_variants (id, organization_id) deferrable,
  foreign key (location_id, organization_id) references public.inventory_locations (id, organization_id) deferrable
);
create index inventory_movements_variant_idx on public.inventory_movements (organization_id, variant_id, created_at desc);
create index inventory_movements_ref_idx on public.inventory_movements (reference_type, reference_id);

-- ---------------------------------------------------------------------------
-- Customers (PII — restricted roles)
-- ---------------------------------------------------------------------------
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  full_name text not null check (char_length(btrim(full_name)) between 2 and 120),
  -- Normalized E.164 Moroccan mobile/landline: +212 followed by 9 digits.
  phone text not null check (phone ~ '^\+212[5-7][0-9]{8}$'),
  city text not null default '' check (char_length(city) <= 80),
  address text not null default '' check (char_length(address) <= 500),
  notes text not null default '' check (char_length(notes) <= 2000),
  tags text[] not null default '{}' check (cardinality(tags) <= 20),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  unique (organization_id, phone)
);
create index customers_org_name_idx on public.customers (organization_id, lower(full_name));

-- ---------------------------------------------------------------------------
-- Marketing & shipping reference data
-- ---------------------------------------------------------------------------
create table public.marketing_campaigns (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  platform public.marketing_platform not null,
  name text not null check (char_length(btrim(name)) between 1 and 160),
  external_id text,
  data_source public.data_source not null default 'manual',
  starts_on date,
  ends_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  check (ends_on is null or starts_on is null or ends_on >= starts_on)
);

create table public.shipping_providers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  kind public.shipping_provider_kind not null default 'manual',
  -- Code key of a verified adapter (lib/shipping/adapters). NULL for manual/csv.
  adapter_key text check (adapter_key is null or adapter_key ~ '^[a-z0-9_]{2,40}$'),
  is_active boolean not null default true,
  notes text not null default '' check (char_length(notes) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  check (kind <> 'api' or adapter_key is not null)
);
create unique index shipping_providers_name_uq on public.shipping_providers (organization_id, lower(name));

-- ---------------------------------------------------------------------------
-- Orders
-- ---------------------------------------------------------------------------
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  store_id uuid,
  order_number text not null,
  customer_id uuid not null,
  location_id uuid not null,
  status public.order_status not null default 'new',
  payment_status public.payment_status not null default 'unpaid',
  stock_state public.stock_state not null default 'none',
  source public.order_source not null default 'other',
  campaign_id uuid,
  exchange_of_order_id uuid,
  -- City is kept on the order (non-PII, used for analytics and shipping fees).
  city text not null default '' check (char_length(city) <= 80),
  subtotal_cents bigint not null default 0 check (subtotal_cents >= 0),
  discount_cents bigint not null default 0 check (discount_cents >= 0),
  shipping_fee_cents bigint not null default 0 check (shipping_fee_cents >= 0),
  total_cents bigint not null default 0 check (total_cents >= 0),
  cod_amount_cents bigint not null default 0 check (cod_amount_cents >= 0),
  notes text not null default '' check (char_length(notes) <= 2000),
  internal_notes text not null default '' check (char_length(internal_notes) <= 4000),
  created_by uuid references auth.users (id) on delete set null,
  confirmed_at timestamptz,
  shipped_at timestamptz,
  delivered_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  unique (organization_id, order_number),
  check (discount_cents <= subtotal_cents),
  check (total_cents = subtotal_cents - discount_cents + shipping_fee_cents),
  check (cod_amount_cents <= total_cents),
  foreign key (store_id, organization_id) references public.stores (id, organization_id) deferrable,
  foreign key (customer_id, organization_id) references public.customers (id, organization_id) deferrable,
  foreign key (location_id, organization_id) references public.inventory_locations (id, organization_id) deferrable,
  foreign key (campaign_id, organization_id) references public.marketing_campaigns (id, organization_id) deferrable,
  foreign key (exchange_of_order_id, organization_id) references public.orders (id, organization_id) deferrable
);
create index orders_org_created_idx on public.orders (organization_id, created_at desc);
create index orders_org_status_idx on public.orders (organization_id, status, created_at desc);
create index orders_customer_idx on public.orders (customer_id, created_at desc);
create index orders_campaign_idx on public.orders (campaign_id) where campaign_id is not null;

-- Contact snapshot at order time. Split from orders so roles without PII
-- access (finance, viewer) can still read orders.
create table public.order_contacts (
  order_id uuid primary key,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  full_name text not null,
  phone text not null check (phone ~ '^\+212[5-7][0-9]{8}$'),
  address text not null default '',
  foreign key (order_id, organization_id) references public.orders (id, organization_id) on delete cascade
);
create index order_contacts_phone_idx on public.order_contacts (organization_id, phone);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  order_id uuid not null,
  variant_id uuid not null,
  product_name text not null,
  variant_title text not null default '',
  sku text not null,
  quantity integer not null check (quantity between 1 and 1000),
  unit_price_cents bigint not null check (unit_price_cents >= 0),
  -- Cost snapshot at order time; NULL when the variant cost was unknown.
  unit_cost_cents bigint check (unit_cost_cents is null or unit_cost_cents >= 0),
  line_total_cents bigint generated always as (quantity * unit_price_cents) stored,
  unique (id, organization_id),
  foreign key (order_id, organization_id) references public.orders (id, organization_id) on delete cascade,
  foreign key (variant_id, organization_id) references public.product_variants (id, organization_id) deferrable
);
create index order_items_order_idx on public.order_items (order_id);
create index order_items_variant_idx on public.order_items (variant_id);

create table public.order_events (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  order_id uuid not null,
  event_type text not null check (event_type in ('created', 'status_changed', 'note', 'shipment', 'payment', 'return')),
  from_status public.order_status,
  to_status public.order_status,
  note text check (char_length(note) <= 2000),
  actor_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  foreign key (order_id, organization_id) references public.orders (id, organization_id) on delete cascade
);
create index order_events_order_idx on public.order_events (order_id, created_at);

-- Allowed order status transitions (single source of truth; mirrored for UI
-- in lib/domain/order-status.ts and checked by a unit test).
create table app.order_transitions (
  from_status public.order_status not null,
  to_status public.order_status not null,
  primary key (from_status, to_status)
);
insert into app.order_transitions (from_status, to_status) values
  ('new', 'confirmation_pending'),
  ('new', 'confirmed'),
  ('new', 'cancelled'),
  ('confirmation_pending', 'confirmed'),
  ('confirmation_pending', 'cancelled'),
  ('confirmed', 'preparing'),
  ('confirmed', 'cancelled'),
  ('preparing', 'ready_to_ship'),
  ('preparing', 'cancelled'),
  ('ready_to_ship', 'shipped'),
  ('ready_to_ship', 'cancelled'),
  ('shipped', 'delivered'),
  ('shipped', 'refused'),
  ('delivered', 'returned'),
  ('delivered', 'exchange_requested');

-- ---------------------------------------------------------------------------
-- Shipping
-- ---------------------------------------------------------------------------
create table public.shipments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  order_id uuid not null,
  provider_id uuid not null,
  tracking_number text check (tracking_number is null or tracking_number ~ '^[A-Za-z0-9._/-]{3,64}$'),
  status public.shipment_status not null default 'pending',
  -- What the carrier charges the merchant (cost), not what the customer pays.
  shipping_cost_cents bigint not null default 0 check (shipping_cost_cents >= 0),
  cod_amount_cents bigint not null default 0 check (cod_amount_cents >= 0),
  delivery_attempts integer not null default 0 check (delivery_attempts >= 0),
  shipped_at timestamptz,
  delivered_at timestamptz,
  returned_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  foreign key (order_id, organization_id) references public.orders (id, organization_id) on delete cascade,
  foreign key (provider_id, organization_id) references public.shipping_providers (id, organization_id) deferrable
);
create unique index shipments_active_per_order_uq on public.shipments (order_id) where status <> 'cancelled';
create unique index shipments_tracking_uq on public.shipments (organization_id, provider_id, tracking_number)
  where tracking_number is not null;
create index shipments_org_status_idx on public.shipments (organization_id, status);

create table public.shipment_events (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  shipment_id uuid not null,
  status public.shipment_status not null,
  note text check (char_length(note) <= 1000),
  data_source public.data_source not null default 'manual',
  actor_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  foreign key (shipment_id, organization_id) references public.shipments (id, organization_id) on delete cascade
);
create index shipment_events_shipment_idx on public.shipment_events (shipment_id, created_at);

-- ---------------------------------------------------------------------------
-- COD reconciliation
-- ---------------------------------------------------------------------------
create table public.cod_remittances (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  provider_id uuid,
  reference text not null default '' check (char_length(reference) <= 120),
  received_on date not null,
  gross_collected_cents bigint not null check (gross_collected_cents >= 0),
  fees_cents bigint not null default 0 check (fees_cents >= 0),
  net_received_cents bigint not null,
  note text not null default '' check (char_length(note) <= 1000),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (id, organization_id),
  check (net_received_cents = gross_collected_cents - fees_cents),
  foreign key (provider_id, organization_id) references public.shipping_providers (id, organization_id) deferrable
);
create index cod_remittances_org_idx on public.cod_remittances (organization_id, received_on desc);

create table public.cod_remittance_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  remittance_id uuid not null,
  order_id uuid not null unique,
  collected_cents bigint not null check (collected_cents >= 0),
  fee_cents bigint not null default 0 check (fee_cents >= 0 and fee_cents <= collected_cents),
  foreign key (remittance_id, organization_id) references public.cod_remittances (id, organization_id) on delete cascade,
  foreign key (order_id, organization_id) references public.orders (id, organization_id) deferrable
);

-- ---------------------------------------------------------------------------
-- Returns, refusals, exchanges
-- ---------------------------------------------------------------------------
create table public.returns (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  order_id uuid not null,
  kind public.return_kind not null,
  status public.return_status not null default 'awaiting_receipt',
  reason text not null default '' check (char_length(reason) <= 1000),
  return_shipping_fee_cents bigint not null default 0 check (return_shipping_fee_cents >= 0),
  refund_amount_cents bigint not null default 0 check (refund_amount_cents >= 0),
  refunded_at timestamptz,
  received_at timestamptz,
  closed_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  foreign key (order_id, organization_id) references public.orders (id, organization_id) on delete cascade
);
create unique index returns_open_per_order_uq on public.returns (order_id) where status <> 'closed';
create index returns_org_status_idx on public.returns (organization_id, status);

create table public.return_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  return_id uuid not null,
  order_item_id uuid not null,
  variant_id uuid not null,
  quantity integer not null check (quantity > 0),
  condition public.item_condition not null default 'pending',
  decided_by uuid references auth.users (id) on delete set null,
  decided_at timestamptz,
  foreign key (return_id, organization_id) references public.returns (id, organization_id) on delete cascade,
  foreign key (order_item_id, organization_id) references public.order_items (id, organization_id) deferrable,
  foreign key (variant_id, organization_id) references public.product_variants (id, organization_id) deferrable
);
create index return_items_return_idx on public.return_items (return_id);

-- ---------------------------------------------------------------------------
-- Expenses
-- ---------------------------------------------------------------------------
create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  category public.expense_category not null,
  amount_cents bigint not null check (amount_cents > 0),
  incurred_on date not null,
  description text not null default '' check (char_length(description) <= 500),
  campaign_id uuid,
  data_source public.data_source not null default 'manual',
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (campaign_id, organization_id) references public.marketing_campaigns (id, organization_id) deferrable
);
create index expenses_org_date_idx on public.expenses (organization_id, incurred_on desc);

-- ---------------------------------------------------------------------------
-- Audit log
-- ---------------------------------------------------------------------------
create table public.audit_logs (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  table_name text not null,
  record_id text not null,
  action text not null check (action in ('INSERT', 'UPDATE', 'DELETE')),
  actor_id uuid,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);
create index audit_logs_org_idx on public.audit_logs (organization_id, created_at desc);
create index audit_logs_record_idx on public.audit_logs (table_name, record_id);

create function app.write_audit_log() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_row jsonb := to_jsonb(coalesce(new, old));
  v_record_id text := coalesce(v_row ->> 'id', concat_ws(':', v_row ->> 'organization_id', v_row ->> 'user_id'));
begin
  if tg_op = 'UPDATE' and to_jsonb(old) = to_jsonb(new) then
    return new;
  end if;
  -- Rows removed by an organization-deletion cascade: the log goes with it.
  if tg_op = 'DELETE' and not exists (select 1 from public.organizations o where o.id = (v_row ->> 'organization_id')::uuid) then
    return old;
  end if;

  insert into public.audit_logs (organization_id, table_name, record_id, action, actor_id, old_data, new_data)
  values (
    (v_row ->> 'organization_id')::uuid,
    tg_table_name,
    v_record_id,
    tg_op,
    auth.uid(),
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end
  );

  return coalesce(new, old);
end;
$$;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------
create trigger touch_updated_at before update on public.organizations for each row execute function app.touch_updated_at();
create trigger touch_updated_at before update on public.organization_members for each row execute function app.touch_updated_at();
create trigger touch_updated_at before update on public.stores for each row execute function app.touch_updated_at();
create trigger touch_updated_at before update on public.products for each row execute function app.touch_updated_at();
create trigger touch_updated_at before update on public.product_variants for each row execute function app.touch_updated_at();
create trigger touch_updated_at before update on public.customers for each row execute function app.touch_updated_at();
create trigger touch_updated_at before update on public.marketing_campaigns for each row execute function app.touch_updated_at();
create trigger touch_updated_at before update on public.shipping_providers for each row execute function app.touch_updated_at();
create trigger touch_updated_at before update on public.orders for each row execute function app.touch_updated_at();
create trigger touch_updated_at before update on public.shipments for each row execute function app.touch_updated_at();
create trigger touch_updated_at before update on public.returns for each row execute function app.touch_updated_at();
create trigger touch_updated_at before update on public.expenses for each row execute function app.touch_updated_at();
create trigger touch_updated_at before update on public.inventory_levels for each row execute function app.touch_updated_at();

create trigger immutable before update or delete on public.inventory_movements for each row execute function app.prevent_mutation();
create trigger immutable before update or delete on public.order_events for each row execute function app.prevent_mutation();
create trigger immutable before update or delete on public.shipment_events for each row execute function app.prevent_mutation();
create trigger immutable before update or delete on public.audit_logs for each row execute function app.prevent_mutation();

create trigger audit after insert or update or delete on public.organization_members for each row execute function app.write_audit_log();
create trigger audit after insert or update or delete on public.products for each row execute function app.write_audit_log();
create trigger audit after insert or update or delete on public.product_variants for each row execute function app.write_audit_log();
create trigger audit after insert or update or delete on public.customers for each row execute function app.write_audit_log();
create trigger audit after insert or update or delete on public.shipping_providers for each row execute function app.write_audit_log();
create trigger audit after insert or update or delete on public.expenses for each row execute function app.write_audit_log();
create trigger audit after insert or update or delete on public.cod_remittances for each row execute function app.write_audit_log();

-- An organization must always keep at least one owner.
create function app.protect_last_owner() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if old.role = 'owner' and (tg_op = 'DELETE' or new.role <> 'owner') then
    -- Allow the cascade when the whole organization is being deleted.
    if not exists (select 1 from public.organizations o where o.id = old.organization_id) then
      return coalesce(new, old);
    end if;
    if (select count(*) from public.organization_members m
        where m.organization_id = old.organization_id and m.role = 'owner') <= 1 then
      raise exception 'LAST_OWNER' using errcode = 'P0001';
    end if;
  end if;
  return coalesce(new, old);
end;
$$;
-- Tenant deletion (support/offboarding only; not exposed to API roles).
-- Intra-tenant foreign keys are DEFERRABLE so the cascade can remove rows
-- in any order and integrity is checked once, at commit.
create function app.delete_organization(p_organization_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  set constraints all deferred;
  delete from public.organizations where id = p_organization_id;
end;
$$;
revoke execute on function app.delete_organization(uuid) from public;

create trigger protect_last_owner before update or delete on public.organization_members
  for each row execute function app.protect_last_owner();
