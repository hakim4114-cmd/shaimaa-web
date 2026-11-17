import "server-only";
import type { requireOrganization } from "@/lib/data/context";
import { formatDateTime } from "@/lib/datetime";
import { getDictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/config";
import type { ExportTable } from "./table";

type Ctx = Awaited<ReturnType<typeof requireOrganization>>;

export const datasets = ["orders", "expenses", "shipments", "receivable"] as const;
export type Dataset = (typeof datasets)[number];

export class ExportForbidden extends Error {}

type RawContact = { full_name: string; phone: string; address: string };
const one = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? (v[0] ?? null) : (v ?? null));

export async function buildDataset(ctx: Ctx, dataset: Dataset, lang: Locale, from: string, to: string): Promise<ExportTable> {
  const t = getDictionary(lang);
  const rtl = lang === "ar";
  const subtitle = `${from} → ${to}`;
  const { supabase, organizationId, can } = ctx;
  // Range filter on timestamps uses Moroccan days: [from 00:00, to+1 00:00) in UTC+0/+1 is approximated by a 1-day margin, then filtered exactly below.
  const fromTs = new Date(`${from}T00:00:00Z`).getTime() - 86400000;
  const toTs = new Date(`${to}T23:59:59Z`).getTime() + 86400000;
  const inRange = (iso: string | null) => {
    if (!iso) return false;
    const day = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Casablanca", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
    return day >= from && day <= to;
  };

  if (dataset === "orders") {
    const withContacts = can.seeContacts;
    const { data } = await supabase
      .from("orders")
      .select(
        `order_number, status, source, city, subtotal_cents, discount_cents, shipping_fee_cents, total_cents, cod_amount_cents, payment_status, notes, created_at, confirmed_at, delivered_at, items:order_items(product_name, variant_title, quantity), shipments(tracking_number, status), campaign:marketing_campaigns(name)${withContacts ? ", contact:order_contacts(full_name, phone, address)" : ""}`
      )
      .eq("organization_id", organizationId)
      .gte("created_at", new Date(fromTs).toISOString())
      .lte("created_at", new Date(toTs).toISOString())
      .order("created_at", { ascending: true })
      .limit(5000)
      .overrideTypes<
        {
          order_number: string; status: keyof typeof t.orderStatus; source: keyof typeof t.orderSource; city: string;
          subtotal_cents: number; discount_cents: number; shipping_fee_cents: number; total_cents: number; cod_amount_cents: number;
          payment_status: string; notes: string; created_at: string; confirmed_at: string | null; delivered_at: string | null;
          items: { product_name: string; variant_title: string; quantity: number }[];
          shipments: { tracking_number: string | null; status: string }[];
          campaign: { name: string } | null;
          contact?: RawContact | RawContact[] | null;
        }[],
        { merge: false }
      >();
    const to_ = t.orders;
    const columns: ExportTable["columns"] = [
      { key: "number", header: to_.colOrder, type: "text", width: 14 },
      { key: "created", header: to_.colCreated, type: "text", width: 18 },
      { key: "status", header: to_.colStatus, type: "text", width: 18 },
      ...(withContacts
        ? ([
            { key: "name", header: to_.fullName, type: "text" },
            { key: "phone", header: to_.phone, type: "text", width: 16 },
            { key: "address", header: to_.address, type: "text", width: 32 }
          ] as ExportTable["columns"])
        : []),
      { key: "city", header: to_.city, type: "text", width: 16 },
      { key: "items", header: to_.sectionItems, type: "text", width: 36 },
      { key: "subtotal", header: to_.subtotal, type: "money" },
      { key: "discount", header: to_.discount, type: "money" },
      { key: "shipping", header: to_.shippingFee, type: "money" },
      { key: "cod", header: to_.cod, type: "money" },
      { key: "source", header: to_.source, type: "text" },
      { key: "campaign", header: t.money.campaign, type: "text" },
      { key: "tracking", header: t.shipping.parcel, type: "text", width: 14 },
      { key: "notes", header: to_.notes, type: "text", width: 30 }
    ];
    const rows = (data ?? [])
      .filter((o) => inRange(o.created_at))
      .map((o) => {
        const contact = one(o.contact);
        return {
          number: o.order_number,
          created: formatDateTime(o.created_at, lang, "short"),
          status: t.orderStatus[o.status] ?? o.status,
          name: contact?.full_name,
          phone: contact ? `0${contact.phone.slice(4)}` : "",
          address: contact?.address,
          city: o.city,
          items: o.items.map((i) => `${i.product_name}${i.variant_title ? ` (${i.variant_title})` : ""} ×${i.quantity}`).join(" ; "),
          subtotal: o.subtotal_cents,
          discount: o.discount_cents,
          shipping: o.shipping_fee_cents,
          cod: o.cod_amount_cents,
          source: t.orderSource[o.source] ?? o.source,
          campaign: o.campaign?.name ?? "",
          tracking: o.shipments.find((s) => s.status !== "cancelled")?.tracking_number ?? "",
          notes: o.notes
        };
      });
    return { title: to_.title, subtitle, columns, rows, rtl };
  }

  if (dataset === "expenses") {
    if (!can.seeMoney) throw new ExportForbidden();
    const { data } = await supabase
      .from("expenses")
      .select("incurred_on, category, amount_cents, description, campaign:marketing_campaigns(name)")
      .eq("organization_id", organizationId)
      .gte("incurred_on", from)
      .lte("incurred_on", to)
      .order("incurred_on")
      .limit(5000)
      .overrideTypes<{ incurred_on: string; category: keyof typeof t.money.categories; amount_cents: number; description: string; campaign: { name: string } | null }[], { merge: false }>();
    return {
      title: t.money.expenses,
      subtitle,
      rtl,
      columns: [
        { key: "date", header: t.money.date, type: "date", width: 12 },
        { key: "category", header: t.money.category, type: "text", width: 22 },
        { key: "amount", header: t.money.amount, type: "money" },
        { key: "campaign", header: t.money.campaign, type: "text" },
        { key: "note", header: t.money.description, type: "text", width: 36 }
      ],
      rows: (data ?? []).map((e) => ({ date: e.incurred_on, category: t.money.categories[e.category] ?? e.category, amount: e.amount_cents, campaign: e.campaign?.name ?? "", note: e.description }))
    };
  }

  if (dataset === "shipments") {
    const { data } = await supabase
      .from("shipments")
      .select("tracking_number, status, carrier_status, carrier_district_name, shipping_cost_cents, cod_amount_cents, created_at, delivered_at, order:orders(order_number, city)")
      .eq("organization_id", organizationId)
      .gte("created_at", new Date(fromTs).toISOString())
      .lte("created_at", new Date(toTs).toISOString())
      .order("created_at")
      .limit(5000)
      .overrideTypes<
        { tracking_number: string | null; status: keyof typeof t.shipping.status; carrier_status: string | null; carrier_district_name: string | null; shipping_cost_cents: number; cod_amount_cents: number; created_at: string; delivered_at: string | null; order: { order_number: string; city: string } | null }[],
        { merge: false }
      >();
    return {
      title: t.shipping.title,
      subtitle,
      rtl,
      columns: [
        { key: "tracking", header: t.shipping.parcel, type: "text", width: 14 },
        { key: "order", header: t.orders.colOrder, type: "text", width: 14 },
        { key: "created", header: t.orders.colCreated, type: "text", width: 18 },
        { key: "status", header: t.orders.colStatus, type: "text", width: 18 },
        { key: "district", header: t.shipping.district, type: "text", width: 24 },
        { key: "cost", header: t.shipping.carrierFee, type: "money" },
        { key: "cod", header: t.orders.cod, type: "money" }
      ],
      rows: (data ?? [])
        .filter((s) => inRange(s.created_at))
        .map((s) => ({
          tracking: s.tracking_number ?? "",
          order: s.order?.order_number ?? "",
          created: formatDateTime(s.created_at, lang, "short"),
          status: t.shipping.status[s.status] ?? s.status,
          district: s.carrier_district_name ?? s.order?.city ?? "",
          cost: s.shipping_cost_cents,
          cod: s.cod_amount_cents
        }))
    };
  }

  // receivable: a balance, not a range.
  if (!can.seeMoney) throw new ExportForbidden();
  const { data } = await supabase
    .from("orders")
    .select("order_number, cod_amount_cents, delivered_at, shipments(tracking_number, status)")
    .eq("organization_id", organizationId)
    .eq("payment_status", "awaiting_remittance")
    .order("delivered_at")
    .limit(5000)
    .overrideTypes<{ order_number: string; cod_amount_cents: number; delivered_at: string | null; shipments: { tracking_number: string | null; status: string }[] }[], { merge: false }>();
  return {
    title: t.money.cash.waiting,
    rtl,
    columns: [
      { key: "order", header: t.orders.colOrder, type: "text", width: 14 },
      { key: "tracking", header: t.shipping.parcel, type: "text", width: 14 },
      { key: "delivered", header: t.shipping.status.delivered, type: "text", width: 18 },
      { key: "cod", header: t.orders.cod, type: "money" }
    ],
    rows: (data ?? []).map((o) => ({
      order: o.order_number,
      tracking: o.shipments.find((s) => s.status !== "cancelled")?.tracking_number ?? "",
      delivered: o.delivered_at ? formatDateTime(o.delivered_at, lang, "short") : "",
      cod: o.cod_amount_cents
    }))
  };
}
