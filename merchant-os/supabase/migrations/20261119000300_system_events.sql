-- Merchant OS — problems log (1.11.0)
-- Failures that happen out of sight (a carrier or store webhook rejected, an
-- automatic parcel that could not be sent) are recorded here and shown to
-- the owner in the bell until marked as handled.

create table public.system_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  source text not null check (source in ('sendit_webhook', 'store_webhook', 'auto_ship', 'sendit_api', 'other')),
  message text not null check (char_length(btrim(message)) between 1 and 300),
  details jsonb not null default '{}' check (jsonb_typeof(details) = 'object'),
  order_id uuid references public.orders (id) on delete set null,
  occurrences integer not null default 1,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references auth.users (id) on delete set null
);
create index system_events_open_idx on public.system_events (organization_id, last_seen_at desc) where resolved_at is null;

revoke all on public.system_events from anon, authenticated;
grant select on public.system_events to authenticated;
alter table public.system_events enable row level security;
create policy system_events_select on public.system_events for select to authenticated
  using (app.has_role(organization_id, '{owner,admin}'));

-- Records a problem. The same open problem (organization, source, message,
-- order) seen again within 24 hours only increases its counter, so a
-- misconfigured webhook cannot flood the log.
create function app.record_system_event(p_organization_id uuid, p_source text, p_message text, p_details jsonb, p_order_id uuid)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
begin
  update public.system_events
  set occurrences = occurrences + 1, last_seen_at = now(), details = coalesce(p_details, '{}')
  where id = (
    select e.id from public.system_events e
    where e.organization_id = p_organization_id and e.source = p_source and e.message = left(btrim(p_message), 300)
      and e.order_id is not distinct from p_order_id and e.resolved_at is null and e.last_seen_at > now() - interval '24 hours'
    order by e.last_seen_at desc limit 1)
  returning id into v_id;
  if v_id is null then
    insert into public.system_events (organization_id, source, message, details, order_id)
    values (p_organization_id, p_source, left(btrim(p_message), 300), coalesce(p_details, '{}'), p_order_id)
    returning id into v_id;
  end if;
  return v_id;
end;
$$;

-- Server-side callers: webhooks (service role).
create function public.report_system_event(p_organization_id uuid, p_source text, p_message text, p_details jsonb default '{}', p_order_id uuid default null)
returns uuid
language sql security definer set search_path = '' as $$
  select app.record_system_event(p_organization_id, p_source, p_message, p_details, p_order_id);
$$;

-- Signed-in members whose action failed in the background (automatic sending).
create function public.report_my_system_event(p_organization_id uuid, p_source text, p_message text, p_details jsonb default '{}', p_order_id uuid default null)
returns uuid
language plpgsql security definer set search_path = '' as $$
begin
  perform app.require_role(p_organization_id, array['owner', 'admin', 'operator', 'warehouse']::public.member_role[]);
  if p_source not in ('auto_ship', 'sendit_api') then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  return app.record_system_event(p_organization_id, p_source, p_message, p_details, p_order_id);
end;
$$;

create function public.resolve_system_event(p_event_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_org uuid;
begin
  select organization_id into v_org from public.system_events where id = p_event_id;
  if v_org is null then
    raise exception 'NOT_FOUND' using errcode = 'P0002';
  end if;
  perform app.require_role(v_org, array['owner', 'admin']::public.member_role[]);
  update public.system_events set resolved_at = now(), resolved_by = auth.uid() where id = p_event_id and resolved_at is null;
end;
$$;

revoke execute on function app.record_system_event(uuid, text, text, jsonb, uuid) from public, anon, authenticated;
revoke execute on function public.report_system_event(uuid, text, text, jsonb, uuid) from public, anon, authenticated;
grant execute on function public.report_system_event(uuid, text, text, jsonb, uuid) to service_role;
revoke execute on function public.report_my_system_event(uuid, text, text, jsonb, uuid), public.resolve_system_event(uuid) from public, anon;
grant execute on function public.report_my_system_event(uuid, text, text, jsonb, uuid), public.resolve_system_event(uuid) to authenticated;
