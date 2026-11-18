-- Merchant OS — low stock count for the bell (1.9.0)
-- Counted per variant across all locations (the app used to compare each
-- location row separately, counting a variant twice and missing variants
-- whose stock is split), in one query instead of loading every stock row.

create function public.low_stock_count(p_organization_id uuid) returns integer
language sql stable security definer set search_path = '' as $$
  select case when app.is_member(p_organization_id) then (
    select count(*)::integer from (
      select v.id
      from public.product_variants v
      join public.products p on p.id = v.product_id
      left join public.inventory_levels l on l.variant_id = v.id
      where v.organization_id = p_organization_id and v.status = 'active' and p.status = 'active'
      group by v.id, v.min_stock_level
      having coalesce(sum(l.available), 0) <= v.min_stock_level
    ) low
  ) else 0 end;
$$;
revoke execute on function public.low_stock_count(uuid) from public, anon;
grant execute on function public.low_stock_count(uuid) to authenticated;
