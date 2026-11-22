/** Days are YYYY-MM-DD in Moroccan time (see lib/datetime businessDay). */
export function addDays(day: string, n: number): string {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/**
 * A parcel is handed to the carrier the day before the customer wants it (Sendit
 * delivers next day in most cities). Anything later waits.
 */
export function shipsLater(deliverOn: string | null, today: string): boolean {
  return deliverOn !== null && deliverOn > addDays(today, 1);
}

/** Last day an order can wait before it must be prepared and sent. */
export function prepareBy(today: string): string {
  return addDays(today, 1);
}

/** Quick picks while on the phone with the customer. */
export function deliveryPresets(today: string): { tomorrow: string; dayAfter: string; saturday: string } {
  const weekday = new Date(`${today}T12:00:00Z`).getUTCDay(); // 0 Sunday … 6 Saturday
  const toSaturday = (6 - weekday + 7) % 7 || 7;
  return { tomorrow: addDays(today, 1), dayAfter: addDays(today, 2), saturday: addDays(today, toSaturday) };
}
