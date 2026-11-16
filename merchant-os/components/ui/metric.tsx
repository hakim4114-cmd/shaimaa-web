import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * A single business figure. `value` must come from real data; pass
 * `value={null}` when the figure cannot be computed and explain why in
 * `unavailableReason` — never substitute a placeholder number.
 */
export function Metric({
  label,
  value,
  hint,
  delta,
  unavailableReason,
  tone = "default",
  className
}: {
  label: string;
  value: ReactNode | null;
  hint?: string;
  delta?: { value: string; direction: "up" | "down" | "flat"; positive: boolean };
  unavailableReason?: string;
  /** "hero" marks the one figure to read first on a page; use at most once per page. */
  tone?: "default" | "hero";
  className?: string;
}) {
  const hero = tone === "hero";
  return (
    <div
      className={cn(
        "rounded-lg border p-4 shadow-card",
        hero ? "border-transparent bg-accent text-accent-foreground" : "border-border bg-surface",
        className
      )}
    >
      <p className={cn("text-xs font-medium", hero ? "opacity-85" : "text-muted-foreground")}>{label}</p>
      {value === null ? (
        <p className={cn("mt-2 text-sm", hero ? "opacity-85" : "text-subtle-foreground")}>{unavailableReason ?? "—"}</p>
      ) : (
        <p className={cn("tabular mt-2 text-2xl font-bold tracking-tight", !hero && "text-foreground")}>{value}</p>
      )}
      <div className="mt-1 flex items-center gap-2 text-xs">
        {delta ? (
          <span className={cn("tabular font-medium", delta.positive ? "text-success" : "text-danger")}>
            {delta.direction === "up" ? "▲" : delta.direction === "down" ? "▼" : "■"} {delta.value}
          </span>
        ) : null}
        {hint ? <span className={hero ? "opacity-85" : "text-muted-foreground"}>{hint}</span> : null}
      </div>
    </div>
  );
}
