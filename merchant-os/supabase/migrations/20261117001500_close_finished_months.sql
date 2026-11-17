-- Merchant OS — a month can be closed only once it is over (1.4.1).
-- A close is permanent; closing the current month would lock a partial
-- profit and the owner pay computed from it.
drop policy closes_insert on public.monthly_closes;
create policy closes_insert on public.monthly_closes for insert to authenticated
  with check (
    app.has_role(organization_id, '{owner,admin}')
    and month < date_trunc('month', now() at time zone 'Africa/Casablanca')::date
  );
