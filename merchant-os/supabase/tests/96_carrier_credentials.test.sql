-- Per-organization Sendit keys (1.6.0). Rolled back.
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
grant execute on all functions in schema tests to anon, authenticated, service_role;

\set owner_a '20000000-0000-0000-0000-0000000000b1'
\set admin_a '20000000-0000-0000-0000-0000000000b2'
\set oper_a  '20000000-0000-0000-0000-0000000000b3'
\set owner_b '20000000-0000-0000-0000-0000000000b4'
insert into auth.users (id) values (:'owner_a'), (:'admin_a'), (:'oper_a'), (:'owner_b');

set local role authenticated;
select tests.login(:'owner_a');
select id as org_a from public.create_organization('Keys A', 'keys-a') \gset
insert into public.organization_members (organization_id, user_id, role) values (:'org_a', :'admin_a', 'admin'), (:'org_a', :'oper_a', 'operator');
select tests.login(:'owner_b');
select id as org_b from public.create_organization('Keys B', 'keys-b') \gset

-- Owner A sets keys: the provider is created if missing ---------------------------
select tests.login(:'owner_a');
select tests.expect_error(format($$select public.set_sendit_credentials(%L, 'pk_aaaaaaaa', '')$$, :'org_a'), 'KEYS_INCOMPLETE');
select tests.expect_error(format($$select public.set_sendit_credentials(%L, 'short', 'short')$$, :'org_a'), 'KEYS_INCOMPLETE');
select public.set_sendit_credentials(:'org_a', ' pk_aaaaaaaa ', 'sk_aaaaaaaa') as prov_a \gset
select tests.eq((select credentials_set from public.shipping_providers where id = :'prov_a'), true, 'keys set: the provider shows it');
update public.shipping_providers set notes = 'still editable' where id = :'prov_a';
select tests.eq((select adapter_key from public.shipping_providers where id = :'prov_a'), 'sendit', 'a Sendit provider is created when missing');
select tests.expect_error('select * from public.provider_secrets', 'permission denied');
select tests.expect_error(format($$update public.shipping_providers set credentials_set = false where id = %L$$, :'prov_a'), 'FORBIDDEN');

-- Same provider on update; admin may, operator may not; other org may not ------------
select tests.login(:'admin_a');
select tests.eq(public.set_sendit_credentials(:'org_a', 'pk_bbbbbbbb', 'sk_bbbbbbbb'), :'prov_a'::uuid, 'updating keys keeps the same provider');
select tests.login(:'oper_a');
select tests.expect_error(format($$select public.set_sendit_credentials(%L, 'pk_cccccccc', 'sk_cccccccc')$$, :'org_a'), 'FORBIDDEN');
select tests.login(:'owner_b');
select tests.expect_error(format($$select public.set_sendit_credentials(%L, 'pk_cccccccc', 'sk_cccccccc')$$, :'org_a'), 'FORBIDDEN');
select public.set_sendit_credentials(:'org_b', 'pk_dddddddd', 'sk_dddddddd') as prov_b \gset

reset role;
set local role service_role;
select tests.eq((select public_key from public.provider_secrets where provider_id = :'prov_a'), 'pk_bbbbbbbb', 'the server reads organization A keys (trimmed, updated)');
select tests.eq((select public_key from public.provider_secrets where provider_id = :'prov_b'), 'pk_dddddddd', 'organization B has its own keys');

-- Clearing -----------------------------------------------------------------------
reset role;
set local role authenticated;
select tests.login(:'owner_a');
select public.set_sendit_credentials(:'org_a', '', '');
select tests.eq((select credentials_set from public.shipping_providers where id = :'prov_a'), false, 'cleared keys: the provider shows it');
reset role;
select tests.eq((select count(*) from public.provider_secrets where provider_id = :'prov_a'), 0::bigint, 'cleared keys are deleted');

rollback;
