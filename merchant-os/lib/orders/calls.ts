import type { Database } from "@/lib/supabase/database.types";

export type CallOutcome = Database["public"]["Enums"]["call_outcome"];

/** Outcomes in the order they are offered after a call (most frequent first). */
export const callOutcomes: readonly CallOutcome[] = [
  "confirmed",
  "no_answer",
  "busy",
  "unreachable",
  "call_back_requested",
  "wrong_number",
  "cancelled",
  "other"
];

export function outcomeNeedsNote(outcome: CallOutcome): boolean {
  return outcome === "cancelled";
}

export function outcomeNeedsTime(outcome: CallOutcome): boolean {
  return outcome === "call_back_requested";
}

export type OrderSource = Database["public"]["Enums"]["order_source"];
export const orderSources: readonly OrderSource[] = ["whatsapp", "facebook", "instagram", "tiktok", "phone", "website", "store", "other"];

export type CallQueueRow = { nextCallAt: string | null; callAttempts: number; createdAt: string };

/**
 * Call queue order: call-backs that are due first (earliest first), then
 * orders never called (oldest first), then other attempts, and call-backs
 * planned for later at the end.
 */
export function compareCallQueue(a: CallQueueRow, b: CallQueueRow, now = Date.now()) {
  const rank = (row: typeof a) => {
    if (row.nextCallAt && Date.parse(row.nextCallAt) <= now) return 0;
    if (row.callAttempts === 0 && !row.nextCallAt) return 1;
    if (!row.nextCallAt) return 2;
    return 3;
  };
  const diff = rank(a) - rank(b);
  if (diff !== 0) return diff;
  const key = (row: typeof a) => (row.nextCallAt ? Date.parse(row.nextCallAt) : Date.parse(row.createdAt));
  return key(a) - key(b);
}

/** After this many unanswered calls the order leaves the queue: call mode offers to cancel it. */
export const maxUnansweredCalls = 5;
const unanswered: readonly CallOutcome[] = ["no_answer", "busy", "unreachable"];

export function isGivenUp(row: { callAttempts: number; lastCallOutcome: CallOutcome | null }): boolean {
  return row.callAttempts >= maxUnansweredCalls && row.lastCallOutcome !== null && unanswered.includes(row.lastCallOutcome);
}
