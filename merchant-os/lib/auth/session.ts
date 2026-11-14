import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import { getSupabasePublicConfig } from "@/lib/supabase/config";
import type { Database } from "@/lib/supabase/database.types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const activeOrganizationCookieName = "mos-org";

export type MemberRole = Database["public"]["Enums"]["member_role"];

export type Membership = {
  role: MemberRole;
  organization: { id: string; name: string; slug: string };
};

export type SessionContext = {
  user: { id: string; email: string };
  memberships: Membership[];
  active: Membership | null;
};

/**
 * The signed-in user, their organizations (read through RLS) and the active
 * one. Cached per request. Returns null when signed out or not configured.
 */
export const getSessionContext = cache(async (): Promise<SessionContext | null> => {
  if (!getSupabasePublicConfig()) {
    return null;
  }
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from("organization_members")
    .select("role, organization:organizations(id, name, slug)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error("MEMBERSHIPS_UNAVAILABLE");
  }

  const memberships: Membership[] = (data ?? []).flatMap((row) =>
    row.organization ? [{ role: row.role, organization: row.organization }] : []
  );
  const preferred = (await cookies()).get(activeOrganizationCookieName)?.value;
  const active = memberships.find((m) => m.organization.id === preferred) ?? memberships[0] ?? null;

  return { user: { id: user.id, email: user.email ?? "" }, memberships, active };
});
