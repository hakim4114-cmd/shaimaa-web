"use client";

import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/ui/empty-state";
import { useI18n } from "@/lib/i18n/provider";

// Notification records (stock alerts, delayed orders, COD reminders) arrive
// with the notifications table in Phase 2. Until then the centre is truthfully empty.
export function NotificationsMenu() {
  const { t } = useI18n();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={t.topbar.notifications}>
          <Bell />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="border-b border-border px-4 py-3 text-sm font-semibold text-foreground">{t.topbar.notifications}</div>
        <EmptyState icon={Bell} title={t.topbar.notificationsEmpty} description={t.topbar.notificationsEmptyHint} className="py-8" />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
