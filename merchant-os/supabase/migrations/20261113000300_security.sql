-- Merchant OS — privileges and Row Level Security (Phase 1)
-- Model:
--   * anon: no access to anything.
--   * authenticated: SELECT through RLS (organization membership + role);
--     direct writes only on master-data tables, also role-gated by RLS.
--     Ledgers and workflow tables are written exclusively by the
--     SECURITY DEFINER functions in 20261113000200.
--   * service_role: server-only, bypasses RLS. Never shipped to browsers.

-- ---------------------------------------------------------------------------
-- Table privileges
-- ---------------------------------------------------------------------------
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke all on all tables in schema app from public, anon, authenticated;

grant select on all tables in schema public to authenticated;

-- Master data editable through RLS.
grant insert, update on public.organization_members, public.stores, public.product_categories,
  public.products, public.product_variants, public.inventory_locations, public.customers,
  public.marketing_campaigns, public.shipping_providers, public.expenses to authenticated;
grant update (name, timezone, order_prefix) on public.organizations to authenticated;
grant delete on public.organization_members, public.expenses, public.product_categories to authenticated;
-- Order header fields staff may edit directly; money/status columns are not grantable.
grant update (notes, internal_notes, campaign_id, source) on public.orders to authenticated;

-- ---------------------------------------------------------------------------
-- Function privileges (PostgreSQL grants EXECUTE to PUBLIC by default)
-- ---------------------------------------------------------------------------
revoke execute on all functions in schema app from public, anon, authenticated;
grant execute on function app.is_member(uuid) to authenticated;
grant execute on function app.has_role(uuid, public.member_role[]) to authenticated;

revoke execute on all functions in schema public from public, anon;
grant execute on function
  public.create_organization(text, text),
  public.adjust_inventory(uuid, uuid, public.inventory_movement_type, integer, text),
  public.create_order(uuid, jsonb),
  public.transition_order(uuid, public.order_status, text),
  public.add_order_note(uuid, text),
  public.create_shipment(uuid, uuid, text, bigint),
  public.update_shipment_status(uuid, public.shipment_status, text, public.data_source),
  public.record_cod_remittance(uuid, uuid, text, date, jsonb, text),
  public.receive_return(uuid, bigint),
  public.inspect_return_item(uuid, public.item_condition),
  public.record_refund(uuid, bigint),
  public.close_return(uuid)
to authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.organization_counters enable row level security;
alter table public.stores enable row level security;
alter table public.product_categories enable row level security;
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.inventory_locations enable row level security;
alter table public.inventory_levels enable row level security;
alter table public.inventory_movements enable row level security;
alter table public.customers enable row level security;
alter table public.marketing_campaigns enable row level security;
alter table public.shipping_providers enable row level security;
alter table public.orders enable row level security;
alter table public.order_contacts enable row level security;
alter table public.order_items enable row level security;
alter table public.order_events enable row level security;
alter table public.shipments enable row level security;
alter table public.shipment_events enable row level security;
alter table public.cod_remittances enable row level security;
alter table public.cod_remittance_items enable row level security;
alter table public.returns enable row level security;
alter table public.return_items enable row level security;
alter table public.expenses enable row level security;
alter table public.audit_logs enable row level security;

-- organization_counters: no policies -> invisible to API roles.

-- Organizations ------------------------------------------------------------
create policy org_select on public.organizations for select to authenticated
  using (app.is_member(id));
create policy org_update on public.organizations for update to authenticated
  using (app.has_role(id, '{owner,admin}')) with check (app.has_role(id, '{owner,admin}'));

-- Members: everyone sees co-members; only owners manage membership.
create policy members_select on public.organization_members for select to authenticated
  using (app.is_member(organization_id));
create policy members_insert on public.organization_members for insert to authenticated
  with check (app.has_role(organization_id, '{owner}'));
create policy members_update on public.organization_members for update to authenticated
  using (app.has_role(organization_id, '{owner}')) with check (app.has_role(organization_id, '{owner}'));
create policy members_delete on public.organization_members for delete to authenticated
  using (app.has_role(organization_id, '{owner}'));

-- Reference/master data readable by all members ---------------------------
create policy stores_select on public.stores for select to authenticated using (app.is_member(organization_id));
create policy stores_write on public.stores for insert to authenticated with check (app.has_role(organization_id, '{owner,admin}'));
create policy stores_update on public.stores for update to authenticated
  using (app.has_role(organization_id, '{owner,admin}')) with check (app.has_role(organization_id, '{owner,admin}'));

create policy categories_select on public.product_categories for select to authenticated using (app.is_member(organization_id));
create policy categories_insert on public.product_categories for insert to authenticated
  with check (app.has_role(organization_id, '{owner,admin,operator}'));
create policy categories_update on public.product_categories for update to authenticated
  using (app.has_role(organization_id, '{owner,admin,operator}')) with check (app.has_role(organization_id, '{owner,admin,operator}'));
create policy categories_delete on public.product_categories for delete to authenticated
  using (app.has_role(organization_id, '{owner,admin}'));

create policy products_select on public.products for select to authenticated using (app.is_member(organization_id));
create policy products_insert on public.products for insert to authenticated
  with check (app.has_role(organization_id, '{owner,admin,operator}'));
create policy products_update on public.products for update to authenticated
  using (app.has_role(organization_id, '{owner,admin,operator}')) with check (app.has_role(organization_id, '{owner,admin,operator}'));

create policy variants_select on public.product_variants for select to authenticated using (app.is_member(organization_id));
create policy variants_insert on public.product_variants for insert to authenticated
  with check (app.has_role(organization_id, '{owner,admin,operator}'));
create policy variants_update on public.product_variants for update to authenticated
  using (app.has_role(organization_id, '{owner,admin,operator}')) with check (app.has_role(organization_id, '{owner,admin,operator}'));

create policy locations_select on public.inventory_locations for select to authenticated using (app.is_member(organization_id));
create policy locations_insert on public.inventory_locations for insert to authenticated
  with check (app.has_role(organization_id, '{owner,admin}'));
create policy locations_update on public.inventory_locations for update to authenticated
  using (app.has_role(organization_id, '{owner,admin}')) with check (app.has_role(organization_id, '{owner,admin}'));

create policy levels_select on public.inventory_levels for select to authenticated using (app.is_member(organization_id));
create policy movements_select on public.inventory_movements for select to authenticated using (app.is_member(organization_id));

create policy campaigns_select on public.marketing_campaigns for select to authenticated using (app.is_member(organization_id));
create policy campaigns_insert on public.marketing_campaigns for insert to authenticated
  with check (app.has_role(organization_id, '{owner,admin}'));
create policy campaigns_update on public.marketing_campaigns for update to authenticated
  using (app.has_role(organization_id, '{owner,admin}')) with check (app.has_role(organization_id, '{owner,admin}'));

create policy providers_select on public.shipping_providers for select to authenticated using (app.is_member(organization_id));
create policy providers_insert on public.shipping_providers for insert to authenticated
  with check (app.has_role(organization_id, '{owner,admin}'));
create policy providers_update on public.shipping_providers for update to authenticated
  using (app.has_role(organization_id, '{owner,admin}')) with check (app.has_role(organization_id, '{owner,admin}'));

-- Customer PII: owner, admin, operator (CRM) and warehouse (labels). -------
create policy customers_select on public.customers for select to authenticated
  using (app.has_role(organization_id, '{owner,admin,operator,warehouse}'));
create policy customers_insert on public.customers for insert to authenticated
  with check (app.has_role(organization_id, '{owner,admin,operator}'));
create policy customers_update on public.customers for update to authenticated
  using (app.has_role(organization_id, '{owner,admin,operator}')) with check (app.has_role(organization_id, '{owner,admin,operator}'));

create policy order_contacts_select on public.order_contacts for select to authenticated
  using (app.has_role(organization_id, '{owner,admin,operator,warehouse}'));

-- Orders and workflow records: readable by all members ---------------------
create policy orders_select on public.orders for select to authenticated using (app.is_member(organization_id));
create policy orders_update on public.orders for update to authenticated
  using (app.has_role(organization_id, '{owner,admin,operator}')) with check (app.has_role(organization_id, '{owner,admin,operator}'));
create policy order_items_select on public.order_items for select to authenticated using (app.is_member(organization_id));
create policy order_events_select on public.order_events for select to authenticated using (app.is_member(organization_id));
create policy shipments_select on public.shipments for select to authenticated using (app.is_member(organization_id));
create policy shipment_events_select on public.shipment_events for select to authenticated using (app.is_member(organization_id));
create policy returns_select on public.returns for select to authenticated using (app.is_member(organization_id));
create policy return_items_select on public.return_items for select to authenticated using (app.is_member(organization_id));

-- Money ---------------------------------------------------------------------
create policy remittances_select on public.cod_remittances for select to authenticated
  using (app.has_role(organization_id, '{owner,admin,finance}'));
create policy remittance_items_select on public.cod_remittance_items for select to authenticated
  using (app.has_role(organization_id, '{owner,admin,finance}'));

create policy expenses_select on public.expenses for select to authenticated
  using (app.has_role(organization_id, '{owner,admin,finance}'));
create policy expenses_insert on public.expenses for insert to authenticated
  with check (app.has_role(organization_id, '{owner,admin,finance}'));
create policy expenses_update on public.expenses for update to authenticated
  using (app.has_role(organization_id, '{owner,admin,finance}')) with check (app.has_role(organization_id, '{owner,admin,finance}'));
create policy expenses_delete on public.expenses for delete to authenticated
  using (app.has_role(organization_id, '{owner,admin,finance}'));

-- Audit ---------------------------------------------------------------------
create policy audit_select on public.audit_logs for select to authenticated
  using (app.has_role(organization_id, '{owner,admin}'));

-- ---------------------------------------------------------------------------
-- Tenant and authorship integrity on directly-writable tables
-- ---------------------------------------------------------------------------
create function app.guard_tenant_row() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and new.organization_id is distinct from old.organization_id then
    raise exception 'TENANT_IMMUTABLE' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create function app.stamp_created_by() returns trigger
language plpgsql set search_path = '' as $$
begin
  -- API callers cannot attribute rows to someone else.
  if auth.uid() is not null then
    new.created_by := auth.uid();
  end if;
  return new;
end;
$$;

create trigger guard_tenant before update on public.organization_members for each row execute function app.guard_tenant_row();
create trigger guard_tenant before update on public.stores for each row execute function app.guard_tenant_row();
create trigger guard_tenant before update on public.product_categories for each row execute function app.guard_tenant_row();
create trigger guard_tenant before update on public.products for each row execute function app.guard_tenant_row();
create trigger guard_tenant before update on public.product_variants for each row execute function app.guard_tenant_row();
create trigger guard_tenant before update on public.inventory_locations for each row execute function app.guard_tenant_row();
create trigger guard_tenant before update on public.customers for each row execute function app.guard_tenant_row();
create trigger guard_tenant before update on public.marketing_campaigns for each row execute function app.guard_tenant_row();
create trigger guard_tenant before update on public.shipping_providers for each row execute function app.guard_tenant_row();
create trigger guard_tenant before update on public.expenses for each row execute function app.guard_tenant_row();

create trigger stamp_created_by before insert on public.products for each row execute function app.stamp_created_by();
create trigger stamp_created_by before insert on public.expenses for each row execute function app.stamp_created_by();

revoke execute on function app.guard_tenant_row(), app.stamp_created_by() from public, anon, authenticated;
