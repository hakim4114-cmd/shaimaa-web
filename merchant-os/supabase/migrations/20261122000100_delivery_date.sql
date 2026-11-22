-- Merchant OS — delivery on a chosen day (1.23.0)
--
-- A customer often says "send it on Saturday". The order keeps that day; it is
-- not sent to the carrier before the day before, the "waiting to ship" alert and
-- the work lists wait for it, and the delivery follow-up shows it. Set while
-- confirming, on the order, or on a parcel already with the courier (then the
-- courier is told by hand).

alter table public.orders add column deliver_on date;

create function public.set_delivery_date(p_order_id uuid, p_day date, p_note text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_order public.orders;
  v_today date := (now() at time zone 'Africa/Casablanca')::date;
begin
  select * into v_order from public.orders where id = p_order_id;
  if not found then
    raise exception 'ORDER_NOT_FOUND' using errcode = 'P0002';
  end if;
  perform app.require_role(v_order.organization_id, array['owner', 'admin', 'operator']::public.member_role[]);
  if v_order.status not in ('new', 'confirmation_pending', 'confirmed', 'preparing', 'ready_to_ship', 'shipped') then
    raise exception 'INVALID_TRANSITION' using errcode = 'P0001';
  end if;
  -- No day in the past, nor so far that the customer will have forgotten (two months).
  if p_day is not null and (p_day < v_today or p_day > v_today + 60) then
    raise exception 'INVALID_DATE' using errcode = 'P0001';
  end if;
  update public.orders set deliver_on = p_day, updated_at = now() where id = p_order_id;
  perform app.add_order_event(
    v_order, 'note', null, null,
    case when p_day is null then 'Delivery: as soon as possible' else 'Delivery on ' || to_char(p_day, 'YYYY-MM-DD') end
      || case when coalesce(btrim(p_note), '') <> '' then ' — ' || btrim(p_note) else '' end
  );
end;
$$;
revoke execute on function public.set_delivery_date(uuid, date, text) from public, anon;
grant execute on function public.set_delivery_date(uuid, date, text) to authenticated;
