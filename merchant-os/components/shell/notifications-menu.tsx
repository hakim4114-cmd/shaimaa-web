"use client";

import { Bell } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/ui/empty-state";
import type { Alert } from "@/lib/data/alerts";
import { useI18n } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";

/** Computed on each page load from live records (no stored notifications to go stale). */
export function NotificationsMenu({ alerts = [] }: { alerts?: Alert[] }) {
  const { t } = useI18n();
  const urgent = alerts.some((a) => a.tone === "danger");
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={t.topbar.notifications} className="relative">
          <Bell />
          {alerts.length ? (
            <span className={cn("absolute end-1.5 top-1.5 size-2.5 rounded-full ring-2 ring-background", urgent ? "bg-danger" : "bg-warning")} aria-hidden />
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="border-b border-border px-4 py-3 text-sm font-semibold text-foreground">{t.topbar.notifications}</div>
        {alerts.length === 0 ? (
          <EmptyState icon={Bell} title={t.topbar.notificationsEmpty} description={t.topbar.notificationsAllClear} className="py-8" />
        ) : (
          <div className="p-1">
            {alerts.map((alert) => (
              <DropdownMenuItem key={alert.key} asChild>
                <Link href={alert.href} className="flex items-center justify-between gap-3">
                  <span className="text-sm">{t.topbar.alerts[alert.key]}</span>
                  <span
                    className={cn(
                      "tabular rounded-full px-2 py-0.5 text-xs font-semibold",
                      alert.tone === "danger" ? "bg-danger-soft text-danger" : alert.tone === "warning" ? "bg-warning-soft text-warning" : "bg-info-soft text-info"
                    )}
                  >
                    {alert.count}
                  </span>
                </Link>
              </DropdownMenuItem>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
