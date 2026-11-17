import "server-only";
import { redirect } from "next/navigation";
import { getSessionContext, type MemberRole } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const catalogWriters: MemberRole[] = ["owner", "admin", "operator"];
const stockWriters: MemberRole[] = ["owner", "admin", "warehouse"];
const orderWriters: MemberRole[] = ["owner", "admin", "operator"];
const contactReaders: MemberRole[] = ["owner", "admin", "operator", "warehouse"];
const fulfilment: MemberRole[] = ["owner", "admin", "operator", "warehouse"];

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
    organizationName: session.active.organization.name,
    role,
    can: {
      editCatalog: catalogWriters.includes(role),
      moveStock: stockWriters.includes(role),
      seeCosts: role !== "viewer" && role !== "warehouse",
      manageOrders: orderWriters.includes(role),
      // Preparing / ready to ship can also be set by the warehouse.
      prepareOrders: fulfilment.includes(role),
      seeContacts: contactReaders.includes(role),
      // Only owners and admins may create an order for a blocked number or unblock it.
      overrideBlocklist: role === "owner" || role === "admin",
      // Money pages (reports, cash, expenses, marketing spend).
      seeMoney: role === "owner" || role === "admin" || role === "finance",
      receiveReturns: role === "owner" || role === "admin" || role === "warehouse"
    }
  };
}
