-- Merchant OS — no new ad spend below the capital floor without a reason (1.18.1)
--
-- Below the floor only owner withdrawals were blocked: a third losing test
-- could take the shop further down with no objection. An ad expense recorded
-- while the business value is below the floor now needs a written reason and
-- is flagged 'below_floor' (docs/SCENARIOS.md, D9). It is not refused: ads are
-- paid by card outside the app, and refusing to record would hide the spend.

create or replace function app.expense_guard_flags(p_organization_id uuid, p_category public.expense_category, p_amount_cents bigint, p_day date) returns text[]
language plpgsql stable security definer set search_path = '' as $$
declare
  v record;
  v_flags text[] := '{}';
  v_month_ads bigint;
  v_stock_pct integer;
begin
  if not app.has_role(p_organization_id, '{owner,admin,finance}') then
    return '{}';
  end if;
  select * into v from app.money_position(p_organization_id);
  if not v.configured then
    return '{}';
  end if;
  if v.cash_cents - p_amount_cents < v.reserve_cents then
    v_flags := v_flags || 'reserve'::text;
  end if;
  if p_category = 'advertising' then
    if v.below_floor then
      v_flags := v_flags || 'below_floor'::text;
    end if;
    select coalesce(sum(amount_cents), 0) into v_month_ads
    from public.expenses
    where organization_id = p_organization_id and category = 'advertising'
      and incurred_on >= date_trunc('month', p_day)::date
      and incurred_on < (date_trunc('month', p_day) + interval '1 month')::date;
    if v_month_ads + p_amount_cents > app.ad_budget(p_organization_id, p_day) then
      v_flags := v_flags || 'ad_budget'::text;
    end if;
  end if;
  if p_category = 'inventory_purchase' then
    select stock_cash_pct into v_stock_pct from public.cash_settings where organization_id = p_organization_id;
    if p_amount_cents > (greatest(v.free_cents, 0) * v_stock_pct) / 100 then
      v_flags := v_flags || 'stock_cap'::text;
    end if;
  end if;
  return v_flags;
end;
$$;
