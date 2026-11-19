import "server-only";
import type { Json } from "@/lib/supabase/database.types";
import type { createSupabaseAdminClient } from "@/lib/supabase/admin";

type Admin = NonNullable<ReturnType<typeof createSupabaseAdminClient>>;
export type SystemEventSource = "sendit_webhook" | "store_webhook" | "auto_ship" | "sendit_api" | "other";

/** Records a background failure for the owner (problems log). Never throws: logging must not break the caller. */
export async function reportSystemEvent(admin: Admin, organizationId: string, source: SystemEventSource, message: string, details: Record<string, unknown> = {}, orderId?: string) {
  try {
    await admin.rpc("report_system_event", {
      p_organization_id: organizationId,
      p_source: source,
      p_message: message.slice(0, 300),
      p_details: details as Json,
      p_order_id: orderId
    });
  } catch {
    // ignore
  }
}
