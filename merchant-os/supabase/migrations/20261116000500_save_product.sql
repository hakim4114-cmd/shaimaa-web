-- Merchant OS — saving a product with its variants atomically (0.4.0)
-- Products describe their options generically (e.g. Size: S/M/L, Color:
-- Ivory/Gold, or Capacity: 128/256 GB), so the catalog fits any product type.

alter table public.products
  add column options jsonb not null default '[]'
  check (jsonb_typeof(options) = 'array' and jsonb_array_length(options) <= 3);

-- Payload:
-- {
--   "id": uuid (omit to create),
--   "name", "description", "status" ('draft'|'active'|'archived'),
--   "category": text (created if new; empty = none),
--   "options": [{"name": "Size", "values": ["S","M","L"]}],   -- up to 3
--   "variants": [{
--      "id": uuid (omit for new), "sku", "barcode", "title",
--      "option_values": {"Size": "M"}, "price_cents", "cost_cents" (null = unknown),
--      "min_stock_level", "status" ('active'|'archived')
--   }]
-- }
-- Variants missing from the payload are archived, never deleted (orders keep
-- referring to them). Returns the product id.
create function public.save_product(p_organization_id uuid, p_payload jsonb) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_product_id uuid := (p_payload ->> 'id')::uuid;
  v_category_id uuid;
  v_category text := btrim(coalesce(p_payload ->> 'category', ''));
  v_variant jsonb;
  v_variant_id uuid;
  v_kept uuid[] := '{}';
  v_title text;
  v_active integer := 0;
begin
  perform app.require_role(p_organization_id, array['owner', 'admin', 'operator']::public.member_role[]);

  if jsonb_typeof(p_payload -> 'variants') is distinct from 'array' or jsonb_array_length(p_payload -> 'variants') = 0 then
    raise exception 'VARIANTS_REQUIRED' using errcode = 'P0001';
  end if;
  if jsonb_array_length(p_payload -> 'variants') > 100 then
    raise exception 'TOO_MANY_VARIANTS' using errcode = 'P0001';
  end if;

  if v_category <> '' then
    insert into public.product_categories (organization_id, name) values (p_organization_id, v_category)
    on conflict (organization_id, lower(name)) do nothing;
    select c.id into v_category_id from public.product_categories c
    where c.organization_id = p_organization_id and lower(c.name) = lower(v_category);
  end if;

  if v_product_id is null then
    insert into public.products (organization_id, category_id, name, description, status, options, created_by)
    values (
      p_organization_id, v_category_id, btrim(coalesce(p_payload ->> 'name', '')),
      coalesce(p_payload ->> 'description', ''),
      coalesce((p_payload ->> 'status')::public.product_status, 'draft'),
      coalesce(p_payload -> 'options', '[]'::jsonb), auth.uid()
    ) returning id into v_product_id;
  else
    update public.products
    set category_id = v_category_id,
        name = btrim(coalesce(p_payload ->> 'name', '')),
        description = coalesce(p_payload ->> 'description', ''),
        status = coalesce((p_payload ->> 'status')::public.product_status, status),
        options = coalesce(p_payload -> 'options', options)
    where id = v_product_id and organization_id = p_organization_id;
    if not found then
      raise exception 'PRODUCT_NOT_FOUND' using errcode = 'P0002';
    end if;
  end if;

  for v_variant in select * from jsonb_array_elements(p_payload -> 'variants') loop
    v_title := nullif(btrim(coalesce(v_variant ->> 'title', '')), '');
    if v_title is null then
      select string_agg(value, ' / ' order by ordinality) into v_title
      from jsonb_each_text(coalesce(v_variant -> 'option_values', '{}'::jsonb)) with ordinality;
    end if;
    v_variant_id := (v_variant ->> 'id')::uuid;

    if v_variant_id is null then
      insert into public.product_variants (
        organization_id, product_id, sku, barcode, title, option_values, price_cents, cost_cents, min_stock_level, status
      ) values (
        p_organization_id, v_product_id, btrim(v_variant ->> 'sku'), nullif(btrim(coalesce(v_variant ->> 'barcode', '')), ''),
        coalesce(v_title, ''), coalesce(v_variant -> 'option_values', '{}'::jsonb),
        (v_variant ->> 'price_cents')::bigint, (v_variant ->> 'cost_cents')::bigint,
        coalesce((v_variant ->> 'min_stock_level')::integer, 0),
        coalesce((v_variant ->> 'status')::public.product_status, 'active')
      ) returning id into v_variant_id;
    else
      update public.product_variants
      set sku = btrim(v_variant ->> 'sku'),
          barcode = nullif(btrim(coalesce(v_variant ->> 'barcode', '')), ''),
          title = coalesce(v_title, ''),
          option_values = coalesce(v_variant -> 'option_values', '{}'::jsonb),
          price_cents = (v_variant ->> 'price_cents')::bigint,
          cost_cents = (v_variant ->> 'cost_cents')::bigint,
          min_stock_level = coalesce((v_variant ->> 'min_stock_level')::integer, 0),
          status = coalesce((v_variant ->> 'status')::public.product_status, status)
      where id = v_variant_id and product_id = v_product_id and organization_id = p_organization_id;
      if not found then
        raise exception 'VARIANT_NOT_FOUND' using errcode = 'P0002';
      end if;
    end if;

    v_kept := v_kept || v_variant_id;
    if coalesce(v_variant ->> 'status', 'active') = 'active' then
      v_active := v_active + 1;
    end if;
  end loop;

  if v_active = 0 then
    raise exception 'ACTIVE_VARIANT_REQUIRED' using errcode = 'P0001';
  end if;

  update public.product_variants set status = 'archived'
  where product_id = v_product_id and not (id = any (v_kept)) and status <> 'archived';

  return v_product_id;
end;
$$;

revoke execute on function public.save_product(uuid, jsonb) from public, anon;
grant execute on function public.save_product(uuid, jsonb) to authenticated;
grant update (options) on public.products to authenticated;
