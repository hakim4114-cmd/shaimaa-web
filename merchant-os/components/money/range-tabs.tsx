import Link from "next/link";
import { rangePresets, type RangePreset } from "@/lib/ranges";
import { cn } from "@/lib/utils";

export function RangeTabs({ basePath, current, labels, extra = "" }: { basePath: string; current: RangePreset; labels: Record<RangePreset, string>; extra?: string }) {
  return (
    <nav className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0" aria-label="range">
      {rangePresets.map((preset) => (
        <Link
          key={preset}
          href={`${basePath}?range=${preset}${extra}`}
          aria-current={preset === current ? "page" : undefined}
          className={cn(
            "inline-flex h-8 shrink-0 items-center rounded-full border px-3 text-sm font-medium pointer-coarse:h-10",
            preset === current ? "border-transparent bg-foreground text-background" : "border-border bg-surface text-muted-foreground hover:text-foreground"
          )}
        >
          {labels[preset]}
        </Link>
      ))}
    </nav>
  );
}
