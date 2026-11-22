-- One definition of cash: the safe amount and the capital card agree, both from the opening date.
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

\set owner '72000000-0000-0000-0000-00000000000a'
insert into auth.users (id) values (:'owner');
set local role authenticated;
select tests.login(:'owner');
select id as org from public.create_organization('Cash Test', 'cash-test') \gset

-- An entry recorded before the opening date was set (allowed then: no rules yet).
insert into public.cash_entries (organization_id, kind, amount_cents, entry_date) values (:'org', 'capital_in', 100000, current_date - 20);
insert into public.cash_settings (organization_id, opening_date, reserve_pct) values (:'org', current_date - 5, 0);
insert into public.cash_entries (organization_id, kind, amount_cents, entry_date) values (:'org', 'opening', 600000, current_date - 5);

select tests.eq((public.safe_withdrawal(:'org') ->> 'cash_balance_cents')::bigint, 600000::bigint, 'safe amount counts cash from the opening date');
select tests.eq((public.capital_status(:'org') ->> 'cash_cents')::bigint, 600000::bigint, 'capital card counts the same cash');
rollback;
