-- Merchant OS — confirmation channel (1.8.0)
-- Each confirmation attempt records how the customer was reached: phone call
-- or WhatsApp. A confirmed order keeps the channel that confirmed it, so the
-- refusal rate can be compared per channel (owner decision 2026-11-18, to
-- decide later which orders may be confirmed by WhatsApp only).

create type public.contact_channel as enum ('phone', 'whatsapp');

alter table public.order_call_attempts add column channel public.contact_channel not null default 'phone';
alter table public.orders add column confirmed_via public.contact_channel;

drop function public.log_call_attempt(uuid, public.call_outcome, text, timestamptz);

create function public.log_call_attempt(
  p_order_id uuid,
  p_outcome public.call_outcome,
  p_note text default null,
  p_call_back_at timestamptz default null,
  p_channel public.contact_channel default 'phone'
) returns public.orders
language plpgsql security definer set search_path = '' as $$
declare
  v_order public.orders;
  v_channel public.contact_channel := coalesce(p_channel, 'phone');
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'ORDER_NOT_FOUND' using errcode = 'P0002';
  end if;
  perform app.require_role(v_order.organization_id, array['owner', 'admin', 'operator']::public.member_role[]);
  if v_order.status not in ('new', 'confirmation_pending') then
    raise exception 'ORDER_NOT_AWAITING_CONFIRMATION' using errcode = 'P0001';
  end if;
  if p_outcome = 'call_back_requested' and p_call_back_at is null then
    raise exception 'CALL_BACK_TIME_REQUIRED' using errcode = 'P0001';
  end if;
  if p_outcome = 'cancelled' and coalesce(btrim(p_note), '') = '' then
    raise exception 'NOTE_REQUIRED' using errcode = 'P0001';
  end if;

  insert into public.order_call_attempts (organization_id, order_id, outcome, note, call_back_at, actor_id, channel)
  values (v_order.organization_id, v_order.id, p_outcome, nullif(btrim(p_note), ''), p_call_back_at, auth.uid(), v_channel);

  update public.orders
  set call_attempts = call_attempts + 1,
      last_call_outcome = p_outcome,
      next_call_at = case when p_outcome = 'call_back_requested' then p_call_back_at
                          when p_outcome in ('confirmed', 'cancelled') then null
                          else next_call_at end
  where id = v_order.id
  returning * into v_order;

  perform app.add_order_event(v_order, 'call', null, null,
    case when v_channel = 'whatsapp' then 'whatsapp ' else '' end || p_outcome::text || coalesce(': ' || nullif(btrim(p_note), ''), ''));

  if p_outcome = 'confirmed' then
    v_order := app.apply_order_transition(v_order.id, 'confirmed', p_note);
    update public.orders set confirmed_via = v_channel where id = v_order.id returning * into v_order;
  elsif p_outcome = 'cancelled' then
    v_order := app.apply_order_transition(v_order.id, 'cancelled', p_note);
  elsif v_order.status = 'new' then
    v_order := app.apply_order_transition(v_order.id, 'confirmation_pending', null);
  end if;
  return v_order;
end;
$$;

revoke execute on function public.log_call_attempt(uuid, public.call_outcome, text, timestamptz, public.contact_channel) from public, anon;
grant execute on function public.log_call_attempt(uuid, public.call_outcome, text, timestamptz, public.contact_channel) to authenticated;

-- Outcome of confirmed orders per channel, for orders created in [from, to]
-- (Moroccan days). "manual" = confirmed by changing the status directly.
create function public.confirmation_channel_report(p_organization_id uuid, p_from date, p_to date)
returns table (channel text, confirmed bigint, delivered bigint, refused bigint, in_progress bigint)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform app.require_role(p_organization_id, array['owner', 'admin', 'operator', 'finance']::public.member_role[]);
  return query
  select coalesce(o.confirmed_via::text, 'manual'),
         count(*),
         count(*) filter (where o.status = 'delivered'),
         count(*) filter (where o.status in ('refused', 'returned')),
         count(*) filter (where o.status in ('confirmed', 'preparing', 'ready_to_ship', 'shipped'))
  from public.orders o
  where o.organization_id = p_organization_id
    and (o.created_at at time zone 'Africa/Casablanca')::date between p_from and p_to
    and (o.confirmed_via is not null or o.status in ('confirmed', 'preparing', 'ready_to_ship', 'shipped', 'delivered', 'refused', 'returned'))
  group by 1
  order by 2 desc;
end;
$$;
revoke execute on function public.confirmation_channel_report(uuid, date, date) from public, anon;
grant execute on function public.confirmation_channel_report(uuid, date, date) to authenticated;
