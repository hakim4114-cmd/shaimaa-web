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
  className
}: {
  label: string;
  value: ReactNode | null;
  hint?: string;
  delta?: { value: string; direction: "up" | "down" | "flat"; positive: boolean };
  unavailableReason?: string;
  className?: string;
}) {
  return (
    <div className={cn("rounded-lg border border-border bg-surface p-4 shadow-card", className)}>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      {value === null ? (
        <p className="mt-2 text-sm text-subtle-foreground">{unavailableReason ?? "—"}</p>
      ) : (
        <p className="tabular mt-2 text-2xl font-semibold tracking-tight text-foreground">{value}</p>
      )}
      <div className="mt-1 flex items-center gap-2 text-xs">
        {delta ? (
          <span className={cn("tabular font-medium", delta.positive ? "text-success" : "text-danger")}>
            {delta.direction === "up" ? "▲" : delta.direction === "down" ? "▼" : "■"} {delta.value}
          </span>
        ) : null}
        {hint ? <span className="text-muted-foreground">{hint}</span> : null}
      </div>
    </div>
  );
}
