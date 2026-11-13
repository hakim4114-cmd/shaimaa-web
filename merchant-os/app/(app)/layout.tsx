import { cookies } from "next/headers";
import type { ReactNode } from "react";
import { AppShell } from "@/components/shell/app-shell";
import { isDevelopment } from "@/lib/env";
import { sidebarCookieName } from "@/lib/shell";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const collapsed = (await cookies()).get(sidebarCookieName)?.value === "collapsed";
  return (
    <AppShell showDevTools={isDevelopment} initialCollapsed={collapsed}>
      {children}
    </AppShell>
  );
}
