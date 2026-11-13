import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { AppShell } from "@/components/shell/app-shell";
import { getSessionContext } from "@/lib/auth/session";
import { isDevelopment } from "@/lib/env";
import { sidebarCookieName } from "@/lib/shell";
import { getSupabasePublicConfig } from "@/lib/supabase/config";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const collapsed = (await cookies()).get(sidebarCookieName)?.value === "collapsed";
  const configured = getSupabasePublicConfig() !== null;
  const session = configured ? await getSessionContext() : null;

  if (configured && !session) {
    redirect("/sign-in");
  }
  if (session && !session.active) {
    redirect("/onboarding");
  }

  const account =
    session && session.active
      ? {
          email: session.user.email,
          activeOrganizationId: session.active.organization.id,
          memberships: session.memberships.map((m) => ({ role: m.role, organization: { id: m.organization.id, name: m.organization.name } }))
        }
      : null;

  return (
    <AppShell showDevTools={isDevelopment} initialCollapsed={collapsed} account={account}>
      {children}
    </AppShell>
  );
}
