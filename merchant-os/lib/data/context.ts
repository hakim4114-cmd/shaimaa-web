import "server-only";
import { redirect } from "next/navigation";
import { getSessionContext, type MemberRole } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const catalogWriters: MemberRole[] = ["owner", "admin", "operator"];
const stockWriters: MemberRole[] = ["owner", "admin", "warehouse"];

/**
 * The signed-in user's active organization plus a user-scoped Supabase client.
 * Every query through this client is subject to RLS; the role flags only
 * decide which actions the UI offers (the database enforces them again).
 */
export async function requireOrganization() {
  const session = await getSessionContext();
  if (!session) {
    redirect("/sign-in");
  }
  if (!session.active) {
    redirect("/onboarding");
  }
  const supabase = await createSupabaseServerClient();
  const role = session.active.role;
  return {
    supabase,
    organizationId: session.active.organization.id,
    role,
    can: {
      editCatalog: catalogWriters.includes(role),
      moveStock: stockWriters.includes(role),
      seeCosts: role !== "viewer" && role !== "warehouse"
    }
  };
}
