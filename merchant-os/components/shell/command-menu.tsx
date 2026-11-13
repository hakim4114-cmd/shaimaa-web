"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Kbd } from "@/components/ui/kbd";
import { interpolate } from "@/lib/i18n/dictionaries";
import { useI18n } from "@/lib/i18n/provider";
import type { NavGroup } from "@/lib/navigation";
import { cn } from "@/lib/utils";

type Entry = { key: string; label: string; href?: string; hint?: string; icon: NavGroup["items"][number]["icon"] };

/**
 * Global search. Phase 1 searches navigation only; Phase 2 adds records
 * (orders by number/phone, products by SKU, customers) through a server
 * search endpoint scoped by RLS.
 */
export function CommandMenu({ groups, open, onOpenChange }: { groups: NavGroup[]; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t } = useI18n();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        onOpenChange(!open);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onOpenChange]);

  const entries = useMemo<Entry[]>(
    () =>
      groups.flatMap((group) =>
        group.items.map((item) => ({
          key: item.key,
          label: t.nav[item.key],
          href: item.href,
          icon: item.icon,
          hint: item.phase ? interpolate(t.nav.comingInPhase, { phase: item.phase }) : undefined
        }))
      ),
    [groups, t]
  );

  const normalized = query.trim().toLocaleLowerCase();
  const results = entries.filter((entry) => !normalized || entry.label.toLocaleLowerCase().includes(normalized));
  const available = results.filter((entry) => entry.href);
  const soon = results.filter((entry) => !entry.href);
  const safeIndex = Math.min(activeIndex, Math.max(available.length - 1, 0));

  function go(entry: Entry | undefined) {
    if (!entry?.href) {
      return;
    }
    onOpenChange(false);
    setQuery("");
    router.push(entry.href);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) {
          setQuery("");
          setActiveIndex(0);
        }
      }}
    >
      <DialogContent className="max-w-xl overflow-hidden p-0" aria-describedby={undefined}>
        <DialogTitle className="sr-only">{t.topbar.search}</DialogTitle>
        <div className="flex items-center gap-2 border-b border-border px-4">
          <Search className="size-4 text-subtle-foreground" aria-hidden />
          <input
            autoFocus
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setActiveIndex((index) => Math.min(index + 1, available.length - 1));
              } else if (event.key === "ArrowUp") {
                event.preventDefault();
                setActiveIndex((index) => Math.max(index - 1, 0));
              } else if (event.key === "Enter") {
                event.preventDefault();
                go(available[safeIndex]);
              }
            }}
            placeholder={t.topbar.searchPlaceholder}
            className="h-12 w-full bg-transparent text-sm text-foreground outline-none placeholder:text-subtle-foreground"
            aria-label={t.topbar.searchPlaceholder}
          />
          <Kbd>Esc</Kbd>
        </div>
        <div className="max-h-80 overflow-y-auto p-2" role="listbox">
          {results.length === 0 ? <p className="px-3 py-8 text-center text-sm text-muted-foreground">{t.topbar.searchEmpty}</p> : null}
          {available.length > 0 ? <p className="px-2 py-1.5 text-xs font-medium text-subtle-foreground">{t.topbar.searchAvailable}</p> : null}
          {available.map((entry, index) => (
            <button
              key={entry.key}
              type="button"
              role="option"
              aria-selected={index === safeIndex}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => go(entry)}
              className={cn(
                "flex w-full items-center gap-3 rounded-md px-2 py-2 text-start text-sm text-foreground",
                index === safeIndex && "bg-surface-hover"
              )}
            >
              <entry.icon className="size-4 text-muted-foreground" aria-hidden />
              {entry.label}
            </button>
          ))}
          {soon.length > 0 ? <p className="mt-2 px-2 py-1.5 text-xs font-medium text-subtle-foreground">{t.topbar.searchSoon}</p> : null}
          {soon.map((entry) => (
            <div key={entry.key} aria-disabled="true" className="flex items-center gap-3 rounded-md px-2 py-2 text-sm text-subtle-foreground">
              <entry.icon className="size-4" aria-hidden />
              {entry.label}
              <span className="ms-auto text-xs">{entry.hint}</span>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
