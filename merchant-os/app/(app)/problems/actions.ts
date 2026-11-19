"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireOrganization } from "@/lib/data/context";
import { mapDatabaseError, type AppErrorCode } from "@/lib/data/errors";

export async function resolveProblem(id: string): Promise<{ ok?: true; error?: AppErrorCode }> {
  if (!z.string().uuid().safeParse(id).success) return { error: "NOT_FOUND" };
  const { supabase, can } = await requireOrganization();
  if (!can.overrideBlocklist) return { error: "FORBIDDEN" };
  const { error } = await supabase.rpc("resolve_system_event", { p_event_id: id });
  if (error) return { error: mapDatabaseError(error) };
  revalidatePath("/problems");
  return { ok: true };
}
