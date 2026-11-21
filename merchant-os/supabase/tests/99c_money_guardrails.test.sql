-- Money guardrails (1.16.0): capital floor, reserve, ad budget, stock cap. Rolled back.
\set ON_ERROR_STOP 1
\set QUIET 1
begin;

create schema tests;
grant usage on schema tests to anon, authenticated, service_role;
create function tests.expect_error(p_sql text, p_expected text) returns void language plpgsql as $$
begin
  begin execute p_sql;
  exception when others then
    if sqlerrm not like '%' || p_expected || '%' then
      raise exception 'Expected error "%" but got "%" for: %', p_expected, sqlerrm, p_sql;
    end if;
    return;
  end;
  raise exception 'Expected error "%" but statement succeeded: %', p_expected, p_sql;
end; $$;
create function tests.eq(p_actual anyelement, p_expected anyelement, p_label text) returns void language plpgsql as $$
begin
  if p_actual is distinct from p_expected then
    raise exception 'FAIL %: expected %, got %', p_label, p_expected, p_actual;
  end if;
  raise notice 'ok - %', p_label;
end; $$;
create function tests.login(p_user uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
$$;

\set owner    '71000000-0000-0000-0000-00000000000a'
\set finance  '71000000-0000-0000-0000-00000000000f'
\set outsider '71000000-0000-0000-0000-0000000000f1'
insert into auth.users (id) values (:'owner'), (:'finance'), (:'outsider');
set local role authenticated;
select tests.login(:'owner');
select id as org from public.create_organization('Guard Test', 'guard-test') \gset
insert into public.organization_members (organization_id, user_id, role) values (:'org', :'finance', 'finance');

-- Before any setting: nothing is guarded (the shop has not set its rules yet).
insert into public.expenses (organization_id, category, amount_cents, incurred_on) values (:'org', 'advertising', 900000, current_date);
select tests.eq((select guard_flags from public.expenses where organization_id = :'org' and amount_cents = 900000), '{}'::text[], 'no rules set: expenses are not guarded');
delete from public.expenses where organization_id = :'org';

-- Capital 6000 MAD and the default rules, all shares of the capital: floor 80 %, reserve 25 % (1500),
-- ads 15 % a month (900, no revenue last month), loss cap 10 % per test (600), stock 50 % of free cash.
insert into public.cash_settings (organization_id, opening_date) values (:'org', current_date - 5);
insert into public.cash_entries (organization_id, kind, amount_cents, entry_date) values (:'org', 'opening', 600000, current_date - 5);
select tests.eq((public.capital_status(:'org') ->> 'capital_cents')::bigint, 600000::bigint, 'capital = money put in');
select tests.eq((public.capital_status(:'org') ->> 'floor_cents')::bigint, 480000::bigint, 'floor = 80 % of the capital');
select tests.eq((public.capital_status(:'org') ->> 'below_floor')::boolean, false, 'at the start the shop is above its floor');
select tests.eq((public.capital_status(:'org') ->> 'reserve_cents')::bigint, 150000::bigint, 'reserve = 25 % of the capital');
select tests.eq((public.capital_status(:'org') ->> 'ad_budget_cents')::bigint, 90000::bigint, 'ad budget = 15 % of the capital');
select tests.eq((public.capital_status(:'org') ->> 'loss_cap_cents')::bigint, 60000::bigint, 'loss cap per test = 10 % of the capital');

-- Nothing dated before the opening date (it would escape the cash count).
select tests.expect_error(format($$insert into public.expenses (organization_id, category, amount_cents, incurred_on, guard_reason) values (%L, 'packaging', 1000, current_date - 30, 'old receipt found')$$, :'org'), 'BEFORE_OPENING_DATE');
select tests.expect_error(format($$select public.record_owner_withdrawal(%L, 1000, current_date - 30, 'backdated withdrawal')$$, :'org'), 'BEFORE_OPENING_DATE');
select tests.expect_error(format($$insert into public.cash_entries (organization_id, kind, amount_cents, entry_date) values (%L, 'capital_in', 1000, current_date - 30)$$, :'org'), 'BEFORE_OPENING_DATE');

-- Ad budget: 800 then 200 more crosses 900 → reason required, then flagged (and 1100 more, flagged too).
insert into public.expenses (organization_id, category, amount_cents, incurred_on) values (:'org', 'advertising', 80000, current_date);
select tests.expect_error(format($$insert into public.expenses (organization_id, category, amount_cents, incurred_on) values (%L, 'advertising', 20000, current_date)$$, :'org'), 'GUARD_REASON_REQUIRED');
insert into public.expenses (organization_id, category, amount_cents, incurred_on, guard_reason) values (:'org', 'advertising', 20000, current_date, 'Ramadan push, agreed');
select tests.eq((select guard_flags from public.expenses where organization_id = :'org' and amount_cents = 20000), '{ad_budget}'::text[], 'over the ad budget: allowed with a reason, flagged');
insert into public.expenses (organization_id, category, amount_cents, incurred_on, guard_reason) values (:'org', 'advertising', 110000, current_date, 'Second push, agreed');
-- A recorded expense cannot be edited to slip past the guard (delete and add it again instead).
select tests.expect_error(format($$update public.expenses set amount_cents = 5000000 where organization_id = %L and amount_cents = 20000$$, :'org'), 'permission denied');
select tests.expect_error(format($$update public.expenses set guard_flags = '{}' where organization_id = %L$$, :'org'), 'permission denied');

-- Stock cap: free cash = 6000 − 2100 − 1500 = 2400; half is 1200.
select tests.expect_error(format($$insert into public.expenses (organization_id, category, amount_cents, incurred_on) values (%L, 'inventory_purchase', 130000, current_date)$$, :'org'), 'GUARD_REASON_REQUIRED');
insert into public.expenses (organization_id, category, amount_cents, incurred_on) values (:'org', 'inventory_purchase', 100000, current_date);
select tests.eq((select guard_flags from public.expenses where organization_id = :'org' and amount_cents = 100000), '{}'::text[], 'stock within half the free cash: no flag');

-- Reserve: cash is now 2900; spending 1500 would leave 1400 < 1500.
select tests.expect_error(format($$insert into public.expenses (organization_id, category, amount_cents, incurred_on) values (%L, 'packaging', 150000, current_date)$$, :'org'), 'GUARD_REASON_REQUIRED');
select tests.expect_error(format($$insert into public.expenses (organization_id, category, amount_cents, incurred_on, guard_reason) values (%L, 'packaging', 150000, current_date, 'short')$$, :'org'), 'GUARD_REASON_REQUIRED');

-- Capital floor: business value 2900 cash + 0 stock < 4800 → no withdrawal at all.
select tests.eq((public.capital_status(:'org') ->> 'below_floor')::boolean, true, 'spending without sales took the shop below its floor');
select tests.expect_error(format($$select public.record_owner_withdrawal(%L, 1000, current_date, 'Small amount, I promise')$$, :'org'), 'CAPITAL_BELOW_FLOOR');

-- Stock at cost counts in the business value: 25 shirts at 80 MAD bring it back above the floor.
select public.save_product(:'org', jsonb_build_object('name', 'Guard Shirt', 'status', 'active', 'options', '[]'::jsonb,
  'variants', jsonb_build_array(jsonb_build_object('sku', 'GRD-1', 'title', '', 'option_values', '{}'::jsonb, 'price_cents', 19900, 'cost_cents', 8000, 'status', 'active')))) as product \gset
select id as variant from public.product_variants where product_id = :'product' \gset
select id as loc from public.inventory_locations where organization_id = :'org' limit 1 \gset
select public.adjust_inventory(:'variant', :'loc', 'receipt', 25, 'test');
select tests.eq((public.capital_status(:'org') ->> 'stock_value_cents')::bigint, 200000::bigint, 'stock valued at cost');
select tests.eq((public.capital_status(:'org') ->> 'below_floor')::boolean, false, 'cash + stock back above the floor');
-- Stock bought on credit is not value: an unpaid obligation is subtracted.
insert into public.payables (organization_id, counterparty, category, amount_cents, due_on) values (:'org', 'Supplier on credit', 'inventory_purchase', 50000, current_date + 60) returning id as credit \gset
select tests.eq((public.capital_status(:'org') ->> 'below_floor')::boolean, true, 'unpaid obligations lower the business value');
delete from public.payables where id = :'credit';

-- Owner pay: never below the reserve, even with a reason (cash 2900, reserve 1500).
select tests.expect_error(format($$select public.record_owner_withdrawal(%L, 150000, current_date, 'I really need this money now')$$, :'org'), 'RESERVE_PROTECTED');

-- Paying a planned obligation is not a new decision: not guarded.
insert into public.payables (organization_id, counterparty, category, amount_cents, due_on) values (:'org', 'Rent', 'rent', 280000, current_date) returning id as rent \gset
select public.pay_payable(:'rent', current_date);
select tests.eq((select guard_flags from public.expenses where organization_id = :'org' and category = 'rent'), '{}'::text[], 'a paid obligation is not guarded');

-- Cumulative loss cap per campaign (default 600 MAD): 700 of ads with no sale crosses it.
insert into public.marketing_campaigns (organization_id, name, platform) values (:'org', 'Wallet test', 'meta') returning id as camp \gset
select tests.eq((select loss_cap_cents from public.campaign_loss_status(:'org') where campaign_id = :'camp'), 60000::bigint, 'a new test gets 10 % of the capital as loss cap (600)');
insert into public.expenses (organization_id, category, amount_cents, incurred_on, campaign_id, guard_reason) values (:'org', 'advertising', 70000, current_date, :'camp', 'First test week, agreed');
select tests.eq((select over_cap from public.campaign_loss_status(:'org') where campaign_id = :'camp'), true, 'the campaign lost 700 after ads: over its cap');
select tests.expect_error(format($$insert into public.expenses (organization_id, category, amount_cents, incurred_on, campaign_id) values (%L, 'advertising', 1000, current_date, %L)$$, :'org', :'camp'), 'GUARD_REASON_REQUIRED');
insert into public.expenses (organization_id, category, amount_cents, incurred_on, campaign_id, guard_reason) values (:'org', 'advertising', 1000, current_date, :'camp', 'Last try with a new picture');
select tests.eq((select 'loss_cap' = any(guard_flags) from public.expenses where campaign_id = :'camp' and amount_cents = 1000), true, 'more ads on a test over its cap: flagged loss_cap');

-- An ad expense with no campaign, while a campaign runs: reason required, flagged no_campaign.
select tests.expect_error(format($$insert into public.expenses (organization_id, category, amount_cents, incurred_on) values (%L, 'advertising', 500, current_date)$$, :'org'), 'GUARD_REASON_REQUIRED');
insert into public.expenses (organization_id, category, amount_cents, incurred_on, guard_reason) values (:'org', 'advertising', 500, current_date, 'Boosted post, no campaign');
select tests.eq((select 'no_campaign' = any(guard_flags) from public.expenses where organization_id = :'org' and amount_cents = 500), true, 'ad spend outside any campaign: flagged no_campaign');

-- A refused piece that comes back damaged is a loss of its cost; a piece without a cost is reported.
insert into public.marketing_campaigns (organization_id, name, platform) values (:'org', 'Damage test', 'meta') returning id as camp2 \gset
select id as tord from public.create_order(:'org', jsonb_build_object(
  'customer', jsonb_build_object('full_name', 'Test Buyer', 'phone', '+212612340000', 'city', 'Rabat'),
  'items', jsonb_build_array(jsonb_build_object('variant_id', :'variant', 'quantity', 1)), 'campaign_id', :'camp2')) \gset
select public.transition_order(:'tord', 'confirmed');
select public.transition_order(:'tord', 'preparing');
select public.transition_order(:'tord', 'ready_to_ship');
select public.transition_order(:'tord', 'shipped');
select public.transition_order(:'tord', 'refused', 'Refused at door');
select id as tret from public.returns where order_id = :'tord' \gset
select public.receive_return(:'tret', 0);
select id as tri from public.return_items where return_id = :'tret' \gset
select public.inspect_return_item(:'tri', 'damaged');
select tests.eq((select profit_cents from public.campaign_loss_status(:'org') where campaign_id = :'camp2'), -8000::bigint, 'a refused piece back damaged costs the test its cost (80 MAD)');
select public.save_product(:'org', jsonb_build_object('name', 'No Cost Belt', 'status', 'active', 'options', '[]'::jsonb,
  'variants', jsonb_build_array(jsonb_build_object('sku', 'NOC-1', 'title', '', 'option_values', '{}'::jsonb, 'price_cents', 9900, 'status', 'active')))) as nocost \gset
select id as nocost_variant from public.product_variants where product_id = :'nocost' \gset
select public.create_order(:'org', jsonb_build_object(
  'customer', jsonb_build_object('full_name', 'Other Buyer', 'phone', '+212612340001', 'city', 'Rabat'),
  'items', jsonb_build_array(jsonb_build_object('variant_id', :'nocost_variant', 'quantity', 2)), 'campaign_id', :'camp2'));
select tests.eq((select missing_cost_items from public.campaign_loss_status(:'org') where campaign_id = :'camp2'), 1::bigint, 'a line without a cost is reported (the result would look too good)');

-- Others: the finance member is guarded the same way; an outsider learns nothing.
select tests.login(:'finance');
select tests.expect_error(format($$insert into public.expenses (organization_id, category, amount_cents, incurred_on) values (%L, 'packaging', 10000, current_date)$$, :'org'), 'GUARD_REASON_REQUIRED');
select tests.login(:'outsider');
select tests.eq(app.expense_guard_flags(:'org', 'advertising', 99999999, current_date), '{}'::text[], 'no flags revealed to a non-member');
select tests.expect_error(format($$select public.capital_status(%L)$$, :'org'), 'FORBIDDEN');

select tests.login(:'owner');
-- The rules follow the capital: 6000 more put in doubles the default loss cap; a campaign can set its own.
insert into public.cash_entries (organization_id, kind, amount_cents, entry_date) values (:'org', 'capital_in', 600000, current_date);
select tests.eq((select loss_cap_cents from public.campaign_loss_status(:'org') where campaign_id = :'camp2'), 120000::bigint, 'capital 12000: loss cap 1200');
select tests.eq((public.capital_status(:'org') ->> 'reserve_cents')::bigint, 300000::bigint, 'capital 12000: reserve 3000');
update public.marketing_campaigns set loss_cap_cents = 5000 where id = :'camp2';
select tests.eq((select over_cap from public.campaign_loss_status(:'org') where campaign_id = :'camp2'), true, 'a campaign with its own 50 MAD cap: the 80 MAD loss is over it');

rollback;
