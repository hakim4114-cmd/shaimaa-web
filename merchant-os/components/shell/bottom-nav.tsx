"use client";

import { LayoutDashboard, Menu, Package, PackageSearch, PhoneCall, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, use } from "react";
import type { Alert } from "@/lib/data/alerts";
import { useI18n } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";

type Tab = { key: "home" | "orders" | "calls" | "tracking"; href: string; icon: LucideIcon; match: (path: string) => boolean };

// What a COD merchant does all day on the phone: check the day, take orders, call, follow parcels.
// Everything else stays one tap away under "More".
const tabs: Tab[] = [
  { key: "home", href: "/", icon: LayoutDashboard, match: (p) => p === "/" },
  { key: "orders", href: "/orders", icon: Package, match: (p) => p.startsWith("/orders") },
  { key: "calls", href: "/calls", icon: PhoneCall, match: (p) => p.startsWith("/calls") },
  { key: "tracking", href: "/tracking", icon: PackageSearch, match: (p) => p.startsWith("/tracking") }
];

/** Phone and tablet only: thumb-reach navigation, with the calls waiting as a badge. */
export function BottomNav({ alerts, onMore }: { alerts: Promise<Alert[]>; onMore: () => void }) {
  const { t } = useI18n();
  const tt = t.topbar.tabs;
  const pathname = usePathname();
  const item = "relative flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors";

  return (
    <nav
      aria-label={tt.label}
      className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_16px_rgb(var(--shadow-tint)/0.06)] backdrop-blur print:hidden lg:hidden"
    >
      {tabs.map((tab) => {
        const active = tab.match(pathname);
        return (
          <Link key={tab.key} href={tab.href} aria-current={active ? "page" : undefined} className={cn(item, active ? "text-accent" : "text-muted-foreground hover:text-foreground")}>
            {active ? <span className="absolute inset-x-6 top-0 h-0.5 rounded-full bg-accent" aria-hidden /> : null}
            <span className="relative">
              <tab.icon className="size-5" aria-hidden />
              {tab.key === "calls" ? (
                <Suspense fallback={null}>
                  <CallsBadge alerts={alerts} />
                </Suspense>
              ) : null}
            </span>
            {tt[tab.key]}
          </Link>
        );
      })}
      <button type="button" onClick={onMore} aria-label={t.nav.openMenu} className={cn(item, "text-muted-foreground hover:text-foreground")}>
        <Menu className="size-5" aria-hidden />
        {tt.more}
      </button>
    </nav>
  );
}

function CallsBadge({ alerts }: { alerts: Promise<Alert[]> }) {
  const count = use(alerts).find((a) => a.key === "callsDue")?.count ?? 0;
  if (!count) return null;
  return (
    <span className="tabular absolute -end-2.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-accent-foreground">
      {count > 99 ? "99+" : count}
    </span>
  );
}
