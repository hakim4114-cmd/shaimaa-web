import { ChevronDown, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * A card that folds: the header shows what the section is and its state in one line,
 * the content opens on tap. Native <details>, so it works without JavaScript and with the keyboard.
 */
export function CollapsibleCard({
  id,
  icon: Icon,
  title,
  status,
  tone = "neutral",
  defaultOpen = false,
  children
}: {
  id: string;
  icon: LucideIcon;
  title: string;
  status?: string;
  tone?: "neutral" | "ok" | "todo";
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <details id={id} open={defaultOpen} className="group rounded-xl border border-border bg-surface shadow-card [&_summary::-webkit-details-marker]:hidden">
      <summary className="flex min-h-16 cursor-pointer list-none items-center gap-3 px-4 py-3 sm:px-5">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent-soft-foreground">
          <Icon className="size-5" aria-hidden />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="font-semibold text-foreground">{title}</span>
          {status ? (
            <span className={cn("truncate text-xs", tone === "ok" ? "text-success" : tone === "todo" ? "text-warning" : "text-muted-foreground")}>{status}</span>
          ) : null}
        </span>
        <ChevronDown className="size-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden />
      </summary>
      <div className="border-t border-border px-4 py-4 sm:px-5">{children}</div>
    </details>
  );
}
