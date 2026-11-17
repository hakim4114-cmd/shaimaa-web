-- Merchant OS — product images and exchanges (0.9.0)

-- ---------------------------------------------------------------------------
-- Product image: one main image per product, stored in the private
-- "product-images" bucket under "<organization_id>/<product_id>/…".
-- ---------------------------------------------------------------------------
alter table public.products
  add column image_path text check (image_path is null or image_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[A-Za-z0-9._-]{1,80}$');
grant update (image_path) on public.products to authenticated;

-- Storage objects exist only on Supabase; skipped on the plain PostgreSQL
-- used by the database tests.
do $$
begin
  if to_regclass('storage.objects') is null then
    raise notice 'storage schema not present: product image bucket skipped';
    return;
  end if;

  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('product-images', 'product-images', false, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
  on conflict (id) do nothing;

  execute $p$create policy product_images_select on storage.objects for select to authenticated
    using (bucket_id = 'product-images' and app.is_member(((storage.foldername(name))[1])::uuid))$p$;
  execute $p$create policy product_images_insert on storage.objects for insert to authenticated
    with check (bucket_id = 'product-images' and app.has_role(((storage.foldername(name))[1])::uuid, '{owner,admin,operator}'))$p$;
  execute $p$create policy product_images_update on storage.objects for update to authenticated
    using (bucket_id = 'product-images' and app.has_role(((storage.foldername(name))[1])::uuid, '{owner,admin,operator}'))$p$;
  execute $p$create policy product_images_delete on storage.objects for delete to authenticated
    using (bucket_id = 'product-images' and app.has_role(((storage.foldername(name))[1])::uuid, '{owner,admin,operator}'))$p$;
end
$$;

-- ---------------------------------------------------------------------------
-- Exchange: the customer keeps none of the old items and receives new ones.
-- The original (delivered) order moves to exchange_requested, which opens an
-- exchange return awaiting the old parcel; a replacement order is created
-- for the same customer, linked by exchange_of_order_id.
-- Money: the replacement's items are not sold twice. Its discount equals its
-- subtotal minus the agreed price difference, so its revenue is only what
-- the customer pays now (price difference + shipping fee).
-- Payload: {"items": [{"variant_id", "quantity"}], "price_difference_cents", "shipping_fee_cents", "reason", "notes"}
-- ---------------------------------------------------------------------------
create function public.create_exchange_order(p_order_id uuid, p_payload jsonb) returns public.orders
language plpgsql security definer set search_path = '' as $$
declare
  v_original public.orders;
  v_new public.orders;
  v_subtotal bigint;
  v_difference bigint := coalesce((p_payload ->> 'price_difference_cents')::bigint, 0);
  v_shipping bigint := coalesce((p_payload ->> 'shipping_fee_cents')::bigint, 0);
  v_reason text := coalesce(nullif(btrim(p_payload ->> 'reason'), ''), 'Exchange');
begin
  select * into v_original from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'ORDER_NOT_FOUND' using errcode = 'P0002';
  end if;
  perform app.require_role(v_original.organization_id, array['owner', 'admin', 'operator']::public.member_role[]);
  if v_original.status <> 'delivered' then
    raise exception 'ORDER_NOT_EXCHANGEABLE' using errcode = 'P0001';
  end if;
  if v_difference < 0 or v_shipping < 0 then
    raise exception 'INVALID_INPUT' using errcode = 'P0001';
  end if;

  perform app.apply_order_transition(v_original.id, 'exchange_requested', v_reason);

  insert into public.orders (
    organization_id, store_id, order_number, customer_id, location_id, source, campaign_id, exchange_of_order_id,
    city, city_id, notes, internal_notes, created_by
  ) values (
    v_original.organization_id, v_original.store_id,
    (select o.order_prefix from public.organizations o where o.id = v_original.organization_id)
      || '-' || lpad(app.next_counter(v_original.organization_id, 'order_number')::text, 6, '0'),
    v_original.customer_id, v_original.location_id, v_original.source, v_original.campaign_id, v_original.id,
    v_original.city, v_original.city_id, coalesce(p_payload ->> 'notes', ''),
    'Exchange of ' || v_original.order_number || ': ' || v_reason, auth.uid()
  ) returning * into v_new;

  insert into public.order_contacts (order_id, organization_id, full_name, phone, address)
  select v_new.id, c.organization_id, c.full_name, c.phone, c.address from public.order_contacts c where c.order_id = v_original.id;

  v_subtotal := app.write_order_items(v_new, p_payload -> 'items');
  if v_difference > v_subtotal then
    raise exception 'INVALID_DISCOUNT' using errcode = 'P0001';
  end if;

  update public.orders
  set subtotal_cents = v_subtotal, discount_cents = v_subtotal - v_difference, shipping_fee_cents = v_shipping,
      total_cents = v_difference + v_shipping, cod_amount_cents = v_difference + v_shipping
  where id = v_new.id
  returning * into v_new;

  perform app.add_order_event(v_new, 'created', null, 'new', 'Exchange of ' || v_original.order_number);
  perform app.add_order_event(v_original, 'note', null, null, 'Exchange order ' || v_new.order_number);
  -- Already agreed with the customer: confirmed straight away (stock reserved).
  v_new := app.apply_order_transition(v_new.id, 'confirmed', 'Exchange');
  return v_new;
end;
$$;

revoke execute on function public.create_exchange_order(uuid, jsonb) from public, anon;
grant execute on function public.create_exchange_order(uuid, jsonb) to authenticated;
