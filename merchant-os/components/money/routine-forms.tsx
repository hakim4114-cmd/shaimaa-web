"use client";

import { Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { toast } from "sonner";
import { closeMonth, judgeDecision, saveDecision, saveFundPlan } from "@/app/(app)/review/actions";
import { FormAlert } from "@/components/auth/form-alert";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import type { AppErrorCode } from "@/lib/data/errors";
import type { Decision } from "@/lib/data/routines";
import { useI18n } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";

export function DecisionForm({ weekStart }: { weekStart: string }) {
  const { t } = useI18n();
  const tr = t.routines;
  const id = useId();
  const router = useRouter();
  const [decision, setDecision] = useState("");
  const [reason, setReason] = useState("");
  const [metric, setMetric] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<AppErrorCode | null>(null);
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          setError(null);
          const result = await saveDecision({ weekStart, decision, reason, metric });
          if (result.error) return setError(result.error);
          setDecision("");
          setReason("");
          setMetric("");
          toast.success(t.money.saved);
          router.refresh();
        });
      }}
    >
      {error ? <FormAlert>{t.errors[error]}</FormAlert> : null}
      <Field label={tr.decision} htmlFor={`${id}-d`}>
        <Input id={`${id}-d`} value={decision} maxLength={1000} placeholder={tr.decisionHint} onChange={(e) => setDecision(e.target.value)} />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={tr.why} htmlFor={`${id}-r`}>
          <Textarea id={`${id}-r`} rows={2} className="min-h-16" value={reason} onChange={(e) => setReason(e.target.value)} />
        </Field>
        <Field label={tr.metric} htmlFor={`${id}-m`}>
          <Input id={`${id}-m`} value={metric} maxLength={200} placeholder={tr.metricHint} onChange={(e) => setMetric(e.target.value)} />
        </Field>
      </div>
      <Button type="submit" className="self-start" disabled={pending || decision.trim().length < 2}>
        {tr.saveDecision}
      </Button>
    </form>
  );
}

export function DecisionList({ decisions }: { decisions: Decision[] }) {
  const { t } = useI18n();
  const tr = t.routines;
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  if (decisions.length === 0) return <p className="text-sm text-muted-foreground">{tr.noDecisions}</p>;
  return (
    <ul className="divide-y divide-border">
      {decisions.map((d) => (
        <li key={d.id} className="flex flex-col gap-1.5 py-3 text-sm">
          <p className="font-medium">{d.decision}</p>
          <p className="text-xs text-muted-foreground">
            <span className="tabular">{d.weekStart}</span>
            {d.reason ? ` · ${d.reason}` : ""}
            {d.metric ? ` · ${tr.metric}: ${d.metric}` : ""}
          </p>
          <div className="flex flex-wrap gap-1">
            {(["worked", "did_not_work", "too_early"] as const).map((o) => (
              <button
                key={o}
                type="button"
                disabled={pending}
                onClick={() => startTransition(async () => { await judgeDecision(d.id, o); router.refresh(); })}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-xs pointer-coarse:py-1.5",
                  d.outcome === o ? (o === "worked" ? "border-success bg-success-soft text-success" : o === "did_not_work" ? "border-danger bg-danger-soft text-danger" : "border-border bg-surface-muted") : "border-border text-muted-foreground"
                )}
              >
                {tr.outcomes[o]}
              </button>
            ))}
          </div>
        </li>
      ))}
    </ul>
  );
}

export function FundPlanForm({ initial }: { initial: { name: string; percent: number }[] }) {
  const { t } = useI18n();
  const tr = t.routines;
  const router = useRouter();
  const [lines, setLines] = useState(
    (initial.length ? initial : tr.defaultFunds.map((name: string, i: number) => ({ name, percent: [50, 20, 20, 10][i] ?? 10 }))).map((l, i) => ({ key: i, name: l.name, percent: String(l.percent) }))
  );
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<AppErrorCode | null>(null);
  const total = lines.reduce((s, l) => s + (Number(l.percent.replace(",", ".")) || 0), 0);
  return (
    <div className="flex flex-col gap-3">
      {error ? <FormAlert>{t.errors[error]}</FormAlert> : null}
      {lines.map((line) => (
        <div key={line.key} className="flex items-center gap-2">
          <Input aria-label={tr.fundName} value={line.name} maxLength={60} onChange={(e) => setLines((ls) => ls.map((l) => (l.key === line.key ? { ...l, name: e.target.value } : l)))} />
          <Input aria-label="%" dir="ltr" inputMode="decimal" className="w-20 shrink-0" value={line.percent} onChange={(e) => setLines((ls) => ls.map((l) => (l.key === line.key ? { ...l, percent: e.target.value } : l)))} />
          <span className="text-sm text-muted-foreground">%</span>
          <Button variant="ghost" size="icon-sm" aria-label={t.common.delete} onClick={() => setLines((ls) => ls.filter((l) => l.key !== line.key))}>
            <Trash2 />
          </Button>
        </div>
      ))}
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="sm" disabled={lines.length >= 10} onClick={() => setLines((ls) => [...ls, { key: Date.now(), name: "", percent: "" }])}>
          <Plus /> {tr.addFund}
        </Button>
        <span className={cn("tabular text-sm", total > 100 ? "text-danger" : "text-muted-foreground")}>{total}% / 100%</span>
      </div>
      <Button
        className="self-start"
        disabled={pending || total > 100}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const result = await saveFundPlan(lines.filter((l) => l.name.trim()).map((l) => ({ name: l.name, percent: l.percent })));
            if (result.error) return setError(result.error);
            toast.success(t.money.saved);
            router.refresh();
          })
        }
      >
        {t.common.save}
      </Button>
    </div>
  );
}

export function CloseMonthButton({ offset }: { offset: number }) {
  const { t } = useI18n();
  const tr = t.routines;
  const router = useRouter();
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<AppErrorCode | null>(null);
  return (
    <div className="flex flex-col gap-2">
      {error ? <FormAlert>{t.errors[error]}</FormAlert> : null}
      <Textarea rows={2} className="min-h-16" placeholder={tr.closeNote} value={note} onChange={(e) => setNote(e.target.value)} />
      <Button
        className="self-start"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const result = await closeMonth(offset, note);
            if (result.error) return setError(result.error);
            toast.success(tr.closed);
            router.refresh();
          })
        }
      >
        {tr.closeMonth}
      </Button>
    </div>
  );
}
