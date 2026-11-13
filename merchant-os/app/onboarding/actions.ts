"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { zodFieldErrors, type FormState } from "@/lib/auth/errors";
import { organizationSchema } from "@/lib/auth/schemas";
import { activeOrganizationCookieName, getSessionContext } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const orgCookieOptions = {
  path: "/",
  maxAge: 60 * 60 * 24 * 365,
  sameSite: "lax" as const,
  httpOnly: true,
  secure: process.env.NODE_ENV === "production"
};

export async function createOrganization(_state: FormState, formData: FormData): Promise<FormState> {
  const session = await getSessionContext();
  if (!session) {
    redirect("/sign-in");
  }
  const values = { name: String(formData.get("name") ?? ""), slug: String(formData.get("slug") ?? "") };
  const parsed = organizationSchema.safeParse({ name: formData.get("name"), slug: formData.get("slug") });
  if (!parsed.success) {
    return { ...zodFieldErrors(parsed.error.issues), values };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("create_organization", { p_name: parsed.data.name, p_slug: parsed.data.slug });
  if (error) {
    if (error.code === "23505") {
      return { fieldErrors: { slug: "SLUG_TAKEN" }, values };
    }
    if (error.code === "23514") {
      return { fieldErrors: { slug: "SLUG_INVALID" }, values };
    }
    return { error: "UNKNOWN", values };
  }

  (await cookies()).set(activeOrganizationCookieName, data.id, orgCookieOptions);
  redirect("/");
}

/** Switches the active organization; only to one the user belongs to. */
export async function switchOrganization(organizationId: string) {
  const session = await getSessionContext();
  if (!session?.memberships.some((m) => m.organization.id === organizationId)) {
    return;
  }
  (await cookies()).set(activeOrganizationCookieName, organizationId, orgCookieOptions);
}
