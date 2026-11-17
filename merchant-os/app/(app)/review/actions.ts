"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireOrganization } from "@/lib/data/context";
import { mapDatabaseError, type AppErrorCode } from "@/lib/data/errors";
import { getReport } from "@/lib/data/money";
import { allocate, getFundPlan } from "@/lib/data/routines";
import { monthRange } from "@/lib/ranges";
import type { Json } from "@/lib/supabase/database.types";

export type RoutineResult = { ok?: true; error?: AppErrorCode };
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export async function saveDecision(input: { weekStart: string; decision: string; reason: string; metric: string }): Promise<RoutineResult> {
  const parsed = z.object({ weekStart: day, decision: z.string().trim().min(2).max(1000), reason: z.string().trim().max(1000), metric: z.string().trim().max(200) }).safeParse(input);
  if (!parsed.success) return { error: "REASON_REQUIRED" };
  const { supabase, organizationId, can } = await requireOrganization();
  if (!can.overrideBlocklist) return { error: "FORBIDDEN" };
  const { error } = await supabase.from("owner_decisions").insert({ organization_id: organizationId, week_start: parsed.data.weekStart, decision: parsed.data.decision, reason: parsed.data.reason, metric: parsed.data.metric });
  if (error) return { error: mapDatabaseError(error) };
  revalidatePath("/review");
  return { ok: true };
}

export async function judgeDecision(id: string, outcome: "worked" | "did_not_work" | "too_early"): Promise<RoutineResult> {
  if (!z.string().uuid().safeParse(id).success || !["worked", "did_not_work", "too_early"].includes(outcome)) return { error: "INVALID_INPUT" };
  const { supabase, organizationId, can } = await requireOrganization();
  if (!can.overrideBlocklist) return { error: "FORBIDDEN" };
  const { error } = await supabase.from("owner_decisions").update({ outcome }).eq("organization_id", organizationId).eq("id", id);
  if (error) return { error: mapDatabaseError(error) };
  revalidatePath("/review");
  return { ok: true };
}

export async function saveFundPlan(lines: { name: string; percent: string }[]): Promise<RoutineResult> {
  const parsed = z.array(z.object({ name: z.string().trim().min(1).max(60), percent: z.string().max(6) })).max(10).safeParse(lines);
  if (!parsed.success) return { error: "INVALID_INPUT" };
  const values = parsed.data.map((l, i) => ({ name: l.name, percent: Number(l.percent.replace(",", ".")), position: i }));
  if (values.some((v) => !Number.isFinite(v.percent) || v.percent <= 0 || v.percent > 100)) return { error: "INVALID_INPUT" };
  if (values.reduce((s, v) => s + v.percent, 0) > 100.0001) return { error: "FUNDS_OVER_100" };
  if (new Set(values.map((v) => v.name.toLowerCase())).size !== values.length) return { error: "INVALID_INPUT" };
  const { supabase, organizationId, can } = await requireOrganization();
  if (!can.overrideBlocklist) return { error: "FORBIDDEN" };
  const { error: delError } = await supabase.from("fund_plan").delete().eq("organization_id", organizationId);
  if (delError) return { error: mapDatabaseError(delError) };
  if (values.length) {
    const { error } = await supabase.from("fund_plan").insert(values.map((v) => ({ organization_id: organizationId, ...v })));
    if (error) return { error: mapDatabaseError(error) };
  }
  revalidatePath("/close");
  return { ok: true };
}

/** Records the month as closed, with the allocations proposed from its net profit. */
export async function closeMonth(offset: number, note: string): Promise<RoutineResult> {
  // Only a finished month can be closed: a close is permanent.
  if (offset !== 1) return { error: "MONTH_NOT_OVER" };
  const { supabase, organizationId, can } = await requireOrganization();
  if (!can.overrideBlocklist) return { error: "FORBIDDEN" };
  const { from, to } = monthRange(offset);
  const [report, plan] = await Promise.all([getReport(supabase, organizationId, from, to), getFundPlan(supabase, organizationId)]);
  if (!report) return { error: "UNKNOWN" };
  const { error } = await supabase.from("monthly_closes").insert({
    organization_id: organizationId,
    month: from,
    net_profit_cents: report.netProfitCents,
    allocations: allocate(report.netProfitCents, plan) as unknown as Json,
    note: String(note ?? "").slice(0, 1000)
  });
  if (error) return { error: error.code === "23505" ? "MONTH_ALREADY_CLOSED" : mapDatabaseError(error) };
  revalidatePath("/close");
  return { ok: true };
}
