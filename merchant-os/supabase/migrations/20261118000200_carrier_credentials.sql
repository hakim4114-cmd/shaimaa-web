-- Merchant OS — per-organization carrier credentials (1.6.0)
--
-- Each organization uses its own Sendit account. The API keys are stored in
-- provider_secrets, readable only by the server (service_role); members only
-- see whether keys are set (shipping_providers.credentials_set). Keys are set
-- or cleared by owner/admin through set_sendit_credentials.

create table public.provider_secrets (
  provider_id uuid primary key references public.shipping_providers (id) on delete cascade,
  public_key text not null check (char_length(public_key) between 8 and 300),
  secret_key text not null check (char_length(secret_key) between 8 and 300),
  updated_at timestamptz not null default now()
);
revoke all on public.provider_secrets from anon, authenticated;
alter table public.provider_secrets enable row level security;

alter table public.shipping_providers add column credentials_set boolean not null default false;

-- Only set_sendit_credentials may change the flag (members can update other provider columns).
create function app.guard_credentials_flag() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.credentials_set is distinct from old.credentials_set and coalesce(current_setting('app.setting_credentials', true), '') <> 'on' then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  return new;
end;
$$;
create trigger guard_credentials_flag before update on public.shipping_providers for each row execute function app.guard_credentials_flag();

create function public.set_sendit_credentials(p_organization_id uuid, p_public_key text, p_secret_key text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_provider uuid;
  v_public text := btrim(coalesce(p_public_key, ''));
  v_secret text := btrim(coalesce(p_secret_key, ''));
begin
  perform app.require_role(p_organization_id, array['owner', 'admin']::public.member_role[]);
  if (v_public = '') <> (v_secret = '') or (v_public <> '' and (char_length(v_public) < 8 or char_length(v_secret) < 8)) then
    raise exception 'KEYS_INCOMPLETE' using errcode = 'P0001';
  end if;

  select id into v_provider from public.shipping_providers
  where organization_id = p_organization_id and adapter_key = 'sendit' for update;
  if v_provider is null then
    insert into public.shipping_providers (organization_id, name, kind, adapter_key, settings)
    values (p_organization_id, 'Sendit', 'api', 'sendit', '{}')
    returning id into v_provider;
  end if;

  if v_public = '' then
    delete from public.provider_secrets where provider_id = v_provider;
  else
    insert into public.provider_secrets (provider_id, public_key, secret_key) values (v_provider, v_public, v_secret)
    on conflict (provider_id) do update set public_key = excluded.public_key, secret_key = excluded.secret_key, updated_at = now();
  end if;
  perform set_config('app.setting_credentials', 'on', true);
  update public.shipping_providers set credentials_set = (v_public <> '') where id = v_provider;
  perform set_config('app.setting_credentials', '', true);
  return v_provider;
end;
$$;

revoke execute on function public.set_sendit_credentials(uuid, text, text) from public, anon;
grant execute on function public.set_sendit_credentials(uuid, text, text) to authenticated;
