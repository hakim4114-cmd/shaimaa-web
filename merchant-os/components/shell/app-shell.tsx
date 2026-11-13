"use client";

import { ChevronsLeft, Menu, Search } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Kbd } from "@/components/ui/kbd";
import { useI18n } from "@/lib/i18n/provider";
import { visibleNavigation } from "@/lib/navigation";
import { sidebarCookieName } from "@/lib/shell";
import { cn } from "@/lib/utils";
import { BrandMark } from "./brand-mark";
import { CommandMenu } from "./command-menu";
import { NotificationsMenu } from "./notifications-menu";
import { PreferencesMenu } from "./preferences-menu";
import { SidebarNav } from "./sidebar-nav";

export function AppShell({
  showDevTools,
  initialCollapsed,
  children
}: {
  showDevTools: boolean;
  initialCollapsed: boolean;
  children: ReactNode;
}) {
  const { t } = useI18n();
  // Built on the client: nav items hold icon components, which cannot cross the server boundary.
  const groups = useMemo(() => visibleNavigation(showDevTools), [showDevTools]);
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  function toggleCollapsed() {
    const next = !collapsed;
    setCollapsed(next);
    document.cookie = `${sidebarCookieName}=${next ? "collapsed" : "expanded"}; path=/; max-age=31536000; samesite=lax`;
  }

  return (
    <div className="flex min-h-dvh">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "sticky top-0 hidden h-dvh shrink-0 flex-col border-e border-border bg-surface-muted/50 transition-[width] duration-200 lg:flex",
          collapsed ? "w-16" : "w-60"
        )}
      >
        <div className={cn("flex h-14 items-center gap-2.5 border-b border-border px-4", collapsed && "justify-center px-0")}>
          <BrandMark />
          {collapsed ? null : <span className="truncate text-sm font-semibold tracking-tight text-foreground">{t.app.name}</span>}
        </div>
        <div className="flex-1 overflow-y-auto">
          <SidebarNav groups={groups} collapsed={collapsed} />
        </div>
        <div className="border-t border-border p-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleCollapsed}
            className={cn("w-full justify-start", collapsed && "justify-center px-0")}
            aria-label={collapsed ? t.nav.expand : t.nav.collapse}
            aria-expanded={!collapsed}
          >
            <ChevronsLeft className={cn("transition-transform rtl:rotate-180", collapsed && "rotate-180 rtl:rotate-0")} />
            {collapsed ? null : <span>{t.nav.collapse}</span>}
          </Button>
        </div>
      </aside>

      {/* Mobile drawer */}
      <Dialog open={mobileOpen} onOpenChange={setMobileOpen}>
        <DialogContent
          aria-describedby={undefined}
          closeLabel={t.nav.closeMenu}
          variant="sheet"
        >
          <DialogTitle className="flex h-14 items-center gap-2.5 border-b border-border px-4 text-sm">
            <BrandMark /> {t.app.name}
          </DialogTitle>
          <SidebarNav groups={groups} onNavigate={() => setMobileOpen(false)} />
        </DialogContent>
      </Dialog>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-background/85 px-4 backdrop-blur sm:px-6">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen(true)} aria-label={t.nav.openMenu}>
            <Menu />
          </Button>
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="flex h-9 w-full max-w-sm items-center gap-2 rounded-md border border-border bg-surface px-3 text-sm text-subtle-foreground shadow-card transition-colors hover:border-border-strong"
          >
            <Search className="size-4" aria-hidden />
            <span className="truncate">{t.topbar.search}</span>
            <Kbd className="ms-auto hidden sm:inline-flex">{t.topbar.searchShortcut}</Kbd>
          </button>
          <div className="ms-auto flex items-center gap-1">
            <NotificationsMenu />
            <PreferencesMenu />
          </div>
        </header>
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:py-8">{children}</main>
      </div>

      <CommandMenu groups={groups} open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  );
}
