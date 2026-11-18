"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireOrganization } from "@/lib/data/context";
import { mapDatabaseError, type AppErrorCode } from "@/lib/data/errors";
import { getSenditProvider } from "@/lib/data/shipping";
import { SenditError, getInvoice, listInvoices, type SenditInvoiceSummary } from "@/lib/shipping/sendit";
import { previewInvoice, readInvoiceLines, type InvoicePreview, type KnownParcel } from "@/lib/shipping/sendit-core";
import { loadSenditKeys } from "@/lib/shipping/sendit-keys";
import type { Json } from "@/lib/supabase/database.types";

export type CashResult<T = undefined> = { ok?: true; data?: T; error?: AppErrorCode; detail?: string };

function fromError(error: unknown): CashResult<never> {
  return error instanceof SenditError ? { error: error.code, detail: error.detail } : { error: "UNKNOWN" };
}

export async function loadSenditInvoices(page = 1): Promise<CashResult<{ invoices: (SenditInvoiceSummary & { recorded: boolean })[]; lastPage: number }>> {
  const { supabase, organizationId, can } = await requireOrganization();
  if (!can.seeMoney) return { error: "FORBIDDEN" };
  const provider = await getSenditProvider(supabase, organizationId);
  if (!provider) return { error: "SENDIT_NOT_ENABLED" };
  const keys = await loadSenditKeys(organizationId);
  if (!keys) return { error: "SENDIT_NOT_CONFIGURED" };
  try {
    const { invoices, lastPage } = await listInvoices(keys, page);
    const { data } = await supabase
      .from("cod_remittances")
      .select("reference")
      .eq("organization_id", organizationId)
      .eq("provider_id", provider.id)
      .in("reference", invoices.map((i) => i.code).concat("-"));
    const recorded = new Set((data ?? []).map((r) => r.reference));
    return { ok: true, data: { invoices: invoices.map((i) => ({ ...i, recorded: recorded.has(i.code) })), lastPage } };
  } catch (error) {
    return fromError(error);
  }
}

async function buildPreview(code: string) {
  const { supabase, organizationId, can } = await requireOrganization();
  if (!can.seeMoney) return { error: "FORBIDDEN" as const };
  const provider = await getSenditProvider(supabase, organizationId);
  if (!provider) return { error: "SENDIT_NOT_ENABLED" as const };
  const keys = await loadSenditKeys(organizationId);
  if (!keys) return { error: "SENDIT_NOT_CONFIGURED" as const };
  const invoice = await getInvoice(keys, code);
  const lines = readInvoiceLines(invoice.items);
  const codes = lines.filter((l) => l.type === "delivery").map((l) => l.code);
  const { data } = await supabase
    .from("shipments")
    .select("tracking_number, order:orders(id, order_number, cod_amount_cents, payment_status)")
    .eq("organization_id", organizationId)
    .eq("provider_id", provider.id)
    .neq("status", "cancelled")
    .in("tracking_number", codes.concat("-"))
    .overrideTypes<{ tracking_number: string; order: { id: string; order_number: string; cod_amount_cents: number; payment_status: string } | null }[], { merge: false }>();
  const parcels = new Map<string, KnownParcel>();
  for (const row of data ?? []) {
    if (row.order) parcels.set(row.tracking_number, { orderId: row.order.id, orderNumber: row.order.order_number, codAmountCents: row.order.cod_amount_cents, paymentStatus: row.order.payment_status });
  }
  return { supabase, organizationId, provider, invoice, preview: previewInvoice(invoice.amountCents, lines, parcels) };
}

export async function previewSenditInvoice(code: string): Promise<CashResult<{ invoice: SenditInvoiceSummary; preview: InvoicePreview }>> {
  if (!/^[A-Za-z0-9_-]{2,40}$/.test(String(code))) return { error: "INVALID_INPUT" };
  try {
    const built = await buildPreview(code);
    if ("error" in built) return { error: built.error };
    const { items: _items, ...summary } = built.invoice;
    void _items;
    return { ok: true, data: { invoice: summary, preview: built.preview } };
  } catch (error) {
    return fromError(error);
  }
}

const recordInput = z.object({ code: z.string().regex(/^[A-Za-z0-9_-]{2,40}$/), acceptGap: z.boolean() });

export async function recordSenditInvoice(input: z.infer<typeof recordInput>): Promise<CashResult> {
  const parsed = recordInput.safeParse(input);
  if (!parsed.success) return { error: "INVALID_INPUT" };
  try {
    const built = await buildPreview(parsed.data.code);
    if ("error" in built) return { error: built.error };
    const { supabase, organizationId, provider, invoice, preview } = built;
    if (preview.mismatches.length > 0 || preview.unknown.length > 0) return { error: "INVOICE_HAS_MISMATCHES" };
    if (preview.impliedOtherCents !== preview.explainedOtherCents && !parsed.data.acceptGap) return { error: "INVOICE_GAP_UNCONFIRMED" };
    const receivedOn = /^\d{4}-\d{2}-\d{2}$/.test(invoice.date) ? invoice.date : new Date().toISOString().slice(0, 10);
    const { error } = await supabase.rpc("record_carrier_invoice", {
      p_organization_id: organizationId,
      p_provider_id: provider.id,
      p_reference: invoice.code,
      p_received_on: receivedOn,
      p_items: preview.settle.map((s) => ({ tracking_number: s.trackingNumber, collected_cents: s.collectedCents, fee_cents: s.feeCents })) as unknown as Json,
      p_invoice_amount_cents: invoice.amountCents,
      p_note: `Sendit ${invoice.status}`
    });
    if (error) return { error: mapDatabaseError(error), detail: error.details ?? undefined };
    revalidatePath("/cash");
    revalidatePath("/");
    return { ok: true };
  } catch (error) {
    return fromError(error);
  }
}
