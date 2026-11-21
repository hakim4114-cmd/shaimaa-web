"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireOrganization } from "@/lib/data/context";
import { mapDatabaseError, type AppErrorCode } from "@/lib/data/errors";
import { expenseCategories, marketingPlatforms } from "@/lib/data/money";
import { businessDay } from "@/lib/datetime";
import { parseMoneyToCents } from "@/lib/money";

export type MoneyResult = { ok?: true; error?: AppErrorCode; detail?: string };

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const expenseInput = z.object({
  category: z.enum(expenseCategories as [string, ...string[]]),
  amount: z.string().max(20),
  incurredOn: day,
  description: z.string().trim().max(500),
  campaignId: z.string().uuid().nullable(),
  // Written reason when the expense crosses a money rule (docs/BUSINESS_RULES.md, "Money guardrails").
  guardReason: z.string().trim().max(500).optional()
});

export async function addExpense(input: z.infer<typeof expenseInput>): Promise<MoneyResult> {
  const parsed = expenseInput.safeParse(input);
  if (!parsed.success) return { error: "INVALID_INPUT" };
  const value = parsed.data;
  const cents = parseMoneyToCents(value.amount);
  if (!cents || cents <= 0) return { error: "AMOUNT_REQUIRED" };
  if (value.incurredOn > businessDay(new Date())) return { error: "INVALID_DATE" };
  const { supabase, organizationId, can } = await requireOrganization();
  if (!can.seeMoney) return { error: "FORBIDDEN" };
  const { error } = await supabase.from("expenses").insert({
    organization_id: organizationId,
    category: value.category as (typeof expenseCategories)[number],
    amount_cents: cents,
    incurred_on: value.incurredOn,
    description: value.description,
    campaign_id: value.category === "advertising" ? value.campaignId : null,
    guard_reason: value.guardReason ?? ""
  });
  if (error) return { error: mapDatabaseError(error), detail: error.details ?? undefined };
  revalidatePath("/finance");
  revalidatePath("/marketing");
  revalidatePath("/");
  return { ok: true };
}

/** Open obligations that look like this expense (same category and amount): probably the same money, to be paid from Obligations instead. */
export async function findMatchingObligation(category: string, amount: string): Promise<{ id: string; counterparty: string; dueOn: string } | null> {
  const cents = parseMoneyToCents(amount);
  if (!cents || !(expenseCategories as readonly string[]).includes(category)) return null;
  const { supabase, organizationId, can } = await requireOrganization();
  if (!can.seeMoney) return null;
  const { data } = await supabase
    .from("payables")
    .select("id, counterparty, due_on")
    .eq("organization_id", organizationId)
    .is("paid_on", null)
    .eq("category", category as (typeof expenseCategories)[number])
    .eq("amount_cents", cents)
    .order("due_on")
    .limit(1)
    .maybeSingle();
  return data ? { id: data.id, counterparty: data.counterparty, dueOn: data.due_on } : null;
}

export async function deleteExpense(id: string): Promise<MoneyResult> {
  if (!z.string().uuid().safeParse(id).success) return { error: "NOT_FOUND" };
  const { supabase, organizationId, can } = await requireOrganization();
  if (!can.seeMoney) return { error: "FORBIDDEN" };
  const { error, count } = await supabase.from("expenses").delete({ count: "exact" }).eq("organization_id", organizationId).eq("id", id);
  if (error) return { error: mapDatabaseError(error) };
  if (!count) return { error: "NOT_FOUND" };
  revalidatePath("/finance");
  revalidatePath("/marketing");
  revalidatePath("/");
  return { ok: true };
}

const campaignInput = z.object({
  name: z.string().trim().min(1).max(160),
  platform: z.enum(marketingPlatforms as [string, ...string[]]),
  startsOn: day.nullable(),
  // Stop-loss for the test this campaign runs, in MAD (empty = the 600 MAD default).
  lossCap: z.string().max(20).optional()
});

export async function createCampaign(input: z.infer<typeof campaignInput>): Promise<MoneyResult> {
  const parsed = campaignInput.safeParse(input);
  if (!parsed.success) return { error: "NAME_REQUIRED" };
  const { supabase, organizationId, can } = await requireOrganization();
  if (!can.overrideBlocklist) return { error: "FORBIDDEN" };
  const { error } = await supabase.from("marketing_campaigns").insert({
    organization_id: organizationId,
    name: parsed.data.name,
    platform: parsed.data.platform as (typeof marketingPlatforms)[number],
    starts_on: parsed.data.startsOn,
    ...(parsed.data.lossCap && parseMoneyToCents(parsed.data.lossCap) !== null ? { loss_cap_cents: parseMoneyToCents(parsed.data.lossCap) as number } : {})
  });
  if (error) return { error: mapDatabaseError(error) };
  revalidatePath("/marketing");
  return { ok: true };
}

export async function endCampaign(id: string): Promise<MoneyResult> {
  if (!z.string().uuid().safeParse(id).success) return { error: "NOT_FOUND" };
  const { supabase, organizationId, can } = await requireOrganization();
  if (!can.overrideBlocklist) return { error: "FORBIDDEN" };
  const { error } = await supabase.from("marketing_campaigns").update({ ends_on: businessDay(new Date()) }).eq("organization_id", organizationId).eq("id", id);
  if (error) return { error: mapDatabaseError(error) };
  revalidatePath("/marketing");
  return { ok: true };
}

/** Attributes an order to a campaign (or none). */
export async function setOrderCampaign(orderId: string, campaignId: string | null): Promise<MoneyResult> {
  if (!z.string().uuid().safeParse(orderId).success || (campaignId && !z.string().uuid().safeParse(campaignId).success)) return { error: "INVALID_INPUT" };
  const { supabase, organizationId, can } = await requireOrganization();
  if (!can.manageOrders) return { error: "FORBIDDEN" };
  const { error } = await supabase.from("orders").update({ campaign_id: campaignId }).eq("organization_id", organizationId).eq("id", orderId);
  if (error) return { error: mapDatabaseError(error) };
  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/marketing");
  return { ok: true };
}
