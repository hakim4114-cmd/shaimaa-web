-- Merchant OS — cancel a parcel before pickup (1.11.2)
-- First real test: a parcel deleted at Sendit left the order "ready to ship"
-- with nothing to ship. Cancelling a parcel that was not picked up now sends
-- the order back to "preparing" (stock stays reserved), ready to ship again.

insert into app.order_transitions (from_status, to_status) values ('ready_to_ship', 'preparing') on conflict do nothing;

create or replace function app.apply_shipment_status(
  p_shipment_id uuid,
  p_status public.shipment_status,
  p_note text,
  p_source public.data_source
) returns public.shipments
language plpgsql security definer set search_path = '' as $$
declare
  v_shipment public.shipments;
  v_order_status public.order_status;
begin
  select * into v_shipment from public.shipments where id = p_shipment_id for update;
  if not found then
    raise exception 'SHIPMENT_NOT_FOUND' using errcode = 'P0002';
  end if;
  if v_shipment.status in ('delivered', 'returned_to_sender', 'cancelled') then
    raise exception 'SHIPMENT_CLOSED' using errcode = 'P0001';
  end if;
  if p_status = 'pending' then
    raise exception 'INVALID_TRANSITION' using errcode = 'P0001';
  end if;

  update public.shipments
  set status = p_status,
      delivery_attempts = delivery_attempts + case when p_status in ('failed_attempt', 'delivered') then 1 else 0 end,
      shipped_at = coalesce(shipped_at, case when p_status in ('picked_up', 'in_transit', 'out_for_delivery') then now() end),
      delivered_at = case when p_status = 'delivered' then now() else delivered_at end,
      returned_at = case when p_status = 'returned_to_sender' then now() else returned_at end
  where id = p_shipment_id
  returning * into v_shipment;

  insert into public.shipment_events (organization_id, shipment_id, status, note, data_source, actor_id)
  values (v_shipment.organization_id, v_shipment.id, p_status, nullif(btrim(p_note), ''), p_source, auth.uid());

  select status into v_order_status from public.orders where id = v_shipment.order_id;
  -- A parcel cancelled before pickup: the order goes back to preparing, so it can be shipped again.
  if p_status = 'cancelled' and v_order_status = 'ready_to_ship' then
    perform app.apply_order_transition(v_shipment.order_id, 'preparing', coalesce(nullif(btrim(p_note), ''), 'Parcel cancelled before pickup'));
    return v_shipment;
  end if;
  if v_order_status = 'ready_to_ship' and p_status in ('picked_up', 'in_transit', 'out_for_delivery', 'delivered', 'failed_attempt', 'returned_to_sender') then
    perform app.apply_order_transition(v_shipment.order_id, 'shipped', 'Carrier: picked up');
    v_order_status := 'shipped';
  end if;

  if v_order_status = 'shipped' and p_status = 'delivered' then
    perform app.apply_order_transition(v_shipment.order_id, 'delivered', 'Carrier: delivered');
  elsif v_order_status = 'shipped' and p_status = 'returned_to_sender' then
    perform app.apply_order_transition(v_shipment.order_id, 'refused', coalesce(nullif(btrim(p_note), ''), 'Carrier: returned to sender'));
  end if;

  return v_shipment;
end;
$$;

