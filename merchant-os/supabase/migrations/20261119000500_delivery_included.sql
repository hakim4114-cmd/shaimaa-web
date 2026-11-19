-- Merchant OS — delivery included in the price, or paid by the customer (1.13.0)
-- Organization default: false = the customer pays the delivery fee of the
-- city (shipping_rates); true = the product price already includes delivery,
-- so new orders default to a delivery fee of 0. Each order can still set its
-- own fee. What the carrier charges stays a cost either way.

alter table public.organizations add column delivery_included boolean not null default false;
grant update (delivery_included) on public.organizations to authenticated;

create or replace function app.default_shipping_fee(p_organization_id uuid, p_city_id integer) returns bigint
language sql stable security definer set search_path = '' as $$
  select case
    when (select o.delivery_included from public.organizations o where o.id = p_organization_id) then 0
    else (select r.customer_fee_cents from public.shipping_rates r
          where r.organization_id = p_organization_id and r.city_id = p_city_id and r.provider_id is null)
  end;
$$;
