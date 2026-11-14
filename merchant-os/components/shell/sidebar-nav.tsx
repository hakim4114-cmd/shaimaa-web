"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Tooltip } from "@/components/ui/tooltip";
import { interpolate } from "@/lib/i18n/dictionaries";
import { useI18n } from "@/lib/i18n/provider";
import type { NavGroup } from "@/lib/navigation";
import { cn } from "@/lib/utils";

export function SidebarNav({
  groups,
  collapsed = false,
  onNavigate
}: {
  groups: NavGroup[];
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const { t, dir } = useI18n();
  const pathname = usePathname();
  const tooltipSide = dir === "rtl" ? "left" : "right";

  return (
    <nav className="flex flex-col gap-5 px-3 py-4" aria-label={t.app.name}>
      {groups.map((group) => (
        <div key={group.key} className="flex flex-col gap-0.5">
          {collapsed ? (
            <div className="mx-auto mb-1 h-px w-5 bg-border" aria-hidden />
          ) : (
            <p className="px-2 pb-1 text-[11px] font-medium uppercase tracking-wider text-subtle-foreground">
              {t.nav.groups[group.key]}
            </p>
          )}
          {group.items.map((item) => {
            const label = t.nav[item.key];
            const Icon = item.icon;
            const phaseLabel = item.phase ? interpolate(t.nav.comingInPhase, { phase: item.phase }) : null;
            const active = item.href ? (item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)) : false;
            const base = cn(
              "group flex h-8 items-center gap-2.5 rounded-md px-2 text-sm transition-colors",
              collapsed && "justify-center px-0"
            );

            const content = (
              <>
                <Icon className={cn("size-4 shrink-0", active ? "text-accent" : "text-subtle-foreground")} aria-hidden />
                {collapsed ? <span className="sr-only">{label}</span> : <span className="truncate">{label}</span>}
                {!collapsed && phaseLabel ? (
                  <span className="ms-auto shrink-0 whitespace-nowrap rounded bg-surface-muted px-1.5 py-px text-[10px] font-medium text-subtle-foreground">
                    {phaseLabel}
                  </span>
                ) : null}
              </>
            );

            const element = item.href ? (
              <Link
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={cn(
                  base,
                  active
                    ? "bg-surface font-medium text-foreground shadow-card ring-1 ring-border"
                    : "text-muted-foreground hover:bg-surface-hover hover:text-foreground"
                )}
              >
                {content}
              </Link>
            ) : (
              // Modules that are not built yet are shown as clearly disabled, never as dead links.
              <span aria-disabled="true" className={cn(base, "cursor-not-allowed text-subtle-foreground/80")}>
                {content}
              </span>
            );

            return (
              <Tooltip
                key={item.key}
                side={tooltipSide}
                disabled={!collapsed}
                content={phaseLabel ? `${label} · ${phaseLabel}` : label}
              >
                {element}
              </Tooltip>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
