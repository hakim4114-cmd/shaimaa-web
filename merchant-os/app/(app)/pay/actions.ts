"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireOrganization } from "@/lib/data/context";
import { mapDatabaseError, type AppErrorCode } from "@/lib/data/errors";
import { expenseCategories } from "@/lib/data/money";
import { businessDay } from "@/lib/datetime";
import { parseMoneyToCents } from "@/lib/money";

export type PayResult = { ok?: true; error?: AppErrorCode; detail?: string };
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const done = () => {
  revalidatePath("/pay");
  revalidatePath("/finance");
  return { ok: true as const };
};

const percent = z.coerce.number().int().min(0).max(100);

export async function saveCashSettings(input: {
  openingDate: string;
  reserveFloor: string;
  ownerFundName: string;
  capitalFloorPct?: string;
  adBudget?: string;
  adBudgetPct?: string;
  stockPct?: string;
  reservePct?: string;
  adCapitalPct?: string;
  lossCapPct?: string;
}): Promise<PayResult> {
  const parsed = z
    .object({
      openingDate: day,
      reserveFloor: z.string().max(20),
      ownerFundName: z.string().trim().max(60),
      capitalFloorPct: percent.optional(),
      adBudget: z.string().max(20).optional(),
      adBudgetPct: percent.optional(),
      stockPct: percent.optional(),
      reservePct: percent.optional(),
      adCapitalPct: percent.optional(),
      lossCapPct: percent.optional()
    })
    .safeParse(input);
  if (!parsed.success) return { error: "INVALID_INPUT" };
  const reserve = parsed.data.reserveFloor.trim() === "" ? 0 : parseMoneyToCents(parsed.data.reserveFloor);
  if (reserve === null) return { error: "AMOUNT_REQUIRED" };
  const { supabase, organizationId, can } = await requireOrganization();
  if (!can.overrideBlocklist) return { error: "FORBIDDEN" };
  // Empty fixed budget = the share of the capital applies.
  const adBudget = parsed.data.adBudget === undefined ? undefined : parsed.data.adBudget.trim() === "" ? null : parseMoneyToCents(parsed.data.adBudget);
  if (parsed.data.adBudget !== undefined && parsed.data.adBudget.trim() !== "" && adBudget === null) return { error: "AMOUNT_REQUIRED" };
  const values = {
    opening_date: parsed.data.openingDate,
    reserve_floor_cents: reserve,
    owner_fund_name: parsed.data.ownerFundName,
    ...(parsed.data.capitalFloorPct !== undefined ? { capital_floor_pct: parsed.data.capitalFloorPct } : {}),
    ...(adBudget !== undefined ? { ad_budget_cents: adBudget } : {}),
    ...(parsed.data.adBudgetPct !== undefined ? { ad_budget_revenue_pct: parsed.data.adBudgetPct } : {}),
    ...(parsed.data.stockPct !== undefined ? { stock_cash_pct: parsed.data.stockPct } : {}),
    ...(parsed.data.reservePct !== undefined ? { reserve_pct: parsed.data.reservePct } : {}),
    ...(parsed.data.adCapitalPct !== undefined ? { ad_budget_capital_pct: parsed.data.adCapitalPct } : {}),
    ...(parsed.data.lossCapPct !== undefined ? { loss_cap_pct: parsed.data.lossCapPct } : {})
  };
  const { data: existing } = await supabase.from("cash_settings").select("organization_id").eq("organization_id", organizationId).maybeSingle();
  const { error } = existing
    ? await supabase.from("cash_settings").update(values).eq("organization_id", organizationId)
    : await supabase.from("cash_settings").insert({ organization_id: organizationId, ...values });
  return error ? { error: mapDatabaseError(error) } : done();
}

export async function addCashEntry(input: { kind: "opening" | "capital_in" | "adjustment"; amount: string; date: string; note: string; negative?: boolean }): Promise<PayResult> {
  const parsed = z.object({ kind: z.enum(["opening", "capital_in", "adjustment"]), amount: z.string().max(20), date: day, note: z.string().trim().max(500), negative: z.boolean().optional() }).safeParse(input);
  if (!parsed.success) return { error: "INVALID_INPUT" };
  const cents = parseMoneyToCents(parsed.data.amount);
  if (!cents) return { error: "AMOUNT_REQUIRED" };
  if (parsed.data.date > businessDay(new Date())) return { error: "INVALID_DATE" };
  if (parsed.data.kind === "adjustment" && parsed.data.note.length < 3) return { error: "REASON_REQUIRED" };
  const { supabase, organizationId, can } = await requireOrganization();
  if (!can.overrideBlocklist) return { error: "FORBIDDEN" };
  const signed = parsed.data.kind === "adjustment" && parsed.data.negative ? -cents : cents;
  const { error } = await supabase.from("cash_entries").insert({ organization_id: organizationId, kind: parsed.data.kind, amount_cents: signed, entry_date: parsed.data.date, note: parsed.data.note });
  return error ? { error: mapDatabaseError(error) } : done();
}

export async function withdraw(input: { amount: string; date: string; note: string }): Promise<PayResult> {
  const parsed = z.object({ amount: z.string().max(20), date: day, note: z.string().trim().max(500) }).safeParse(input);
  if (!parsed.success) return { error: "INVALID_INPUT" };
  const cents = parseMoneyToCents(parsed.data.amount);
  if (!cents) return { error: "AMOUNT_REQUIRED" };
  const { supabase, organizationId, can } = await requireOrganization();
  if (!can.overrideBlocklist) return { error: "FORBIDDEN" };
  const { error } = await supabase.rpc("record_owner_withdrawal", { p_organization_id: organizationId, p_amount_cents: cents, p_date: parsed.data.date, p_note: parsed.data.note });
  if (error) return error.message.includes("OVER_SAFE_LIMIT") ? { error: "OVER_SAFE_LIMIT", detail: error.details ?? undefined } : { error: mapDatabaseError(error) };
  return done();
}

export async function addPayable(input: { counterparty: string; description: string; category: string; amount: string; dueOn: string; recurrence: string }): Promise<PayResult> {
  const parsed = z
    .object({
      counterparty: z.string().trim().min(1).max(120),
      description: z.string().trim().max(500),
      category: z.enum(expenseCategories as [string, ...string[]]),
      amount: z.string().max(20),
      dueOn: day,
      recurrence: z.enum(["none", "weekly", "monthly", "yearly"])
    })
    .safeParse(input);
  if (!parsed.success) return { error: "NAME_REQUIRED" };
  const cents = parseMoneyToCents(parsed.data.amount);
  if (!cents) return { error: "AMOUNT_REQUIRED" };
  const { supabase, organizationId, can } = await requireOrganization();
  if (!can.seeMoney) return { error: "FORBIDDEN" };
  const { error } = await supabase.from("payables").insert({
    organization_id: organizationId,
    counterparty: parsed.data.counterparty,
    description: parsed.data.description,
    category: parsed.data.category as (typeof expenseCategories)[number],
    amount_cents: cents,
    due_on: parsed.data.dueOn,
    recurrence: parsed.data.recurrence
  });
  return error ? { error: mapDatabaseError(error) } : done();
}

export async function payPayable(id: string): Promise<PayResult> {
  if (!z.string().uuid().safeParse(id).success) return { error: "NOT_FOUND" };
  const { supabase, can } = await requireOrganization();
  if (!can.seeMoney) return { error: "FORBIDDEN" };
  const { error } = await supabase.rpc("pay_payable", { p_payable_id: id, p_paid_on: businessDay(new Date()) });
  return error ? { error: mapDatabaseError(error) } : done();
}

export async function deletePayable(id: string): Promise<PayResult> {
  if (!z.string().uuid().safeParse(id).success) return { error: "NOT_FOUND" };
  const { supabase, organizationId, can } = await requireOrganization();
  if (!can.overrideBlocklist) return { error: "FORBIDDEN" };
  const { error } = await supabase.from("payables").delete().eq("organization_id", organizationId).eq("id", id);
  return error ? { error: mapDatabaseError(error) } : done();
}
