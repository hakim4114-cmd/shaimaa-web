import { PrintButton } from "@/components/export/print-button";
import { requireOrganization } from "@/lib/data/context";
import { formatDateTime } from "@/lib/datetime";
import { getI18n } from "@/lib/i18n/server";
import { formatMoney } from "@/lib/money";
import { formatMoroccanPhone } from "@/lib/phone";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t.exports.packingList };
}

type Row = {
  id: string;
  order_number: string;
  status: string;
  city: string;
  cod_amount_cents: number;
  notes: string;
  items: { sku: string; product_name: string; variant_title: string; quantity: number }[];
  shipments: { tracking_number: string | null; status: string }[];
  contact?: { full_name: string; phone: string; address: string } | { full_name: string; phone: string; address: string }[] | null;
};

/** Daily packing list: every order to prepare, and the units to pick per product. A4, print or save as PDF. */
export default async function PackingListPage() {
  const { t, locale } = await getI18n();
  const te = t.exports;
  const { supabase, organizationId, organizationName, can } = await requireOrganization();
  const { data } = await supabase
    .from("orders")
    .select(`id, order_number, status, city, cod_amount_cents, notes, items:order_items(sku, product_name, variant_title, quantity), shipments(tracking_number, status)${can.seeContacts ? ", contact:order_contacts(full_name, phone, address)" : ""}`)
    .eq("organization_id", organizationId)
    .in("status", ["confirmed", "preparing", "ready_to_ship"])
    .order("confirmed_at", { ascending: true })
    .limit(500)
    .overrideTypes<Row[], { merge: false }>();
  const orders = data ?? [];
  const pick = new Map<string, { label: string; qty: number }>();
  for (const o of orders) {
    for (const i of o.items) {
      const entry = pick.get(i.sku) ?? { label: `${i.product_name}${i.variant_title ? ` — ${i.variant_title}` : ""}`, qty: 0 };
      entry.qty += i.quantity;
      pick.set(i.sku, entry);
    }
  }

  return (
    <main className="mx-auto max-w-4xl bg-white p-6 text-sm text-black print:p-0 [&_*]:border-neutral-300">
      <style>{`@page { size: A4; margin: 14mm; } @media print { body { background: white !important; padding: 0 !important; } }`}</style>
      <header className="mb-5 flex items-start justify-between gap-4 border-b pb-3">
        <div>
          <h1 className="text-xl font-bold">{te.packingList}</h1>
          <p>
            {organizationName} · {formatDateTime(new Date(), locale)} · {orders.length} {t.orders.title}
          </p>
        </div>
        <PrintButton label={te.print} />
      </header>

      <section className="mb-6">
        <h2 className="mb-2 font-bold">{te.toPick}</h2>
        <table className="w-full border-collapse">
          <tbody>
            {[...pick.entries()].map(([sku, entry]) => (
              <tr key={sku} className="border-b">
                <td className="py-1.5 pe-3 font-mono text-xs" dir="ltr">{sku}</td>
                <td className="py-1.5 pe-3">{entry.label}</td>
                <td className="tabular py-1.5 text-end text-base font-bold">×{entry.qty}</td>
                <td className="w-10 py-1.5 text-center">☐</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="flex flex-col gap-3">
        {orders.map((o) => {
          const contact = Array.isArray(o.contact) ? o.contact[0] : o.contact;
          const tracking = o.shipments.find((s) => s.status !== "cancelled")?.tracking_number;
          return (
            <article key={o.id} className="break-inside-avoid rounded border p-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="tabular text-base font-bold">{o.order_number}</p>
                <p className="tabular font-bold">{formatMoney(o.cod_amount_cents, locale)}</p>
              </div>
              {contact ? (
                <p>
                  {contact.full_name} · <span dir="ltr">{formatMoroccanPhone(contact.phone)}</span> · {[o.city, contact.address].filter(Boolean).join(" — ")}
                </p>
              ) : (
                <p>{o.city}</p>
              )}
              <ul className="mt-1 list-inside list-disc">
                {o.items.map((i, index) => (
                  <li key={index}>
                    {i.product_name}
                    {i.variant_title ? ` (${i.variant_title})` : ""} ×{i.quantity}
                  </li>
                ))}
              </ul>
              <p className="mt-1 text-xs">
                {t.orderStatus[o.status as keyof typeof t.orderStatus]}
                {tracking ? ` · ${tracking}` : ""}
                {o.notes ? ` · ${o.notes}` : ""}
              </p>
            </article>
          );
        })}
        {orders.length === 0 ? <p>{te.nothingToPack}</p> : null}
      </section>
    </main>
  );
}
