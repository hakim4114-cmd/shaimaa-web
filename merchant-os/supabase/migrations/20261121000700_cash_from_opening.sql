-- Merchant OS — one definition of cash (1.21.1)
--
-- The safe amount to withdraw counted every cash entry, while the capital card,
-- the reserve and the guards count only entries from the opening date: with an
-- entry dated before it, the pay page showed two different cash figures. The
-- safe amount now counts from the opening date too, like everything else.

create or replace function public.safe_withdrawal(p_organization_id uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  tz constant text := 'Africa/Casablanca';
  v_today date := (now() at time zone tz)::date;
  v_settings public.cash_settings;
  v_entries bigint; v_withdrawn bigint; v_payouts bigint; v_expenses bigint;
  v_balance bigint; v_due bigint; v_earned bigint; v_closed integer;
  v_pay_left bigint; v_free bigint; v_safe bigint; v_reason text; v_reserve bigint;
begin
  perform app.require_role(p_organization_id, array['owner', 'admin', 'finance']::public.member_role[]);
  select * into v_settings from public.cash_settings where organization_id = p_organization_id;
  if not found then
    return jsonb_build_object('configured', false);
  end if;

  select coalesce(sum(amount_cents) filter (where kind <> 'owner_withdrawal'), 0), coalesce(-sum(amount_cents) filter (where kind = 'owner_withdrawal'), 0)
  into v_entries, v_withdrawn
  from public.cash_entries where organization_id = p_organization_id and entry_date >= v_settings.opening_date;
  select coalesce(sum(net_received_cents), 0) into v_payouts
  from public.cod_remittances where organization_id = p_organization_id and received_on >= v_settings.opening_date;
  select coalesce(sum(amount_cents), 0) into v_expenses
  from public.expenses where organization_id = p_organization_id and incurred_on >= v_settings.opening_date;
  v_balance := v_entries + v_payouts - v_expenses - v_withdrawn;

  select coalesce(sum(amount_cents), 0) into v_due
  from public.payables where organization_id = p_organization_id and paid_on is null and due_on <= v_today + 30;

  select count(*), coalesce(sum((a ->> 'cents')::bigint) filter (where lower(btrim(a ->> 'name')) = lower(btrim(v_settings.owner_fund_name)) and v_settings.owner_fund_name <> ''), 0)
  into v_closed, v_earned
  from public.monthly_closes c left join lateral jsonb_array_elements(c.allocations) a on true
  where c.organization_id = p_organization_id;
  select count(*) into v_closed from public.monthly_closes where organization_id = p_organization_id;

  v_reserve := app.effective_reserve(p_organization_id);
  v_pay_left := v_earned - v_withdrawn;
  v_free := v_balance - v_due - v_reserve;
  v_safe := greatest(0, least(v_pay_left, v_free));
  v_reason := case
    when v_settings.owner_fund_name = '' then 'no_owner_fund'
    when v_closed = 0 then 'no_closed_month'
    when v_pay_left <= 0 then 'pay_not_earned'
    when v_free <= 0 then 'cash_tight'
    when v_free < v_pay_left then 'limited_by_cash'
    else 'ok' end;

  return jsonb_build_object(
    'configured', true,
    'safe_cents', v_safe,
    'reason', v_reason,
    'cash_balance_cents', v_balance,
    'obligations_30d_cents', v_due,
    'reserve_floor_cents', v_reserve,
    'free_cash_cents', v_free,
    'pay_earned_cents', v_earned,
    'withdrawn_cents', v_withdrawn,
    'pay_left_cents', v_pay_left,
    'closed_months', v_closed,
    'opening_date', v_settings.opening_date,
    'owner_fund_name', v_settings.owner_fund_name
  );
end;
$$;
