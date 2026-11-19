"use client";

import { Download } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { importSenditRates } from "@/app/(app)/shipping/actions";
import { FormAlert } from "@/components/auth/form-alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AppErrorCode } from "@/lib/data/errors";
import { interpolate } from "@/lib/i18n/dictionaries";
import { useI18n } from "@/lib/i18n/provider";

type Mode = "keep" | "fill_empty" | "overwrite";

/** Imports Sendit's fee per city as cost, and optionally as the customer fee. */
export function SenditRatesImport() {
  const { t } = useI18n();
  const ts = t.shipping;
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("fill_empty");
  const [extra, setExtra] = useState("0");
  const [addMissing, setAddMissing] = useState(true);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<{ code: AppErrorCode; detail?: string } | null>(null);
  const [result, setResult] = useState<{ matched: number; customerFeesSet: number; unmatched: string[]; senditCities: number } | null>(null);

  return (
    <div className="flex flex-col gap-3 rounded-md bg-surface-muted p-3 text-sm">
      <p className="font-medium">{ts.importTitle}</p>
      <p className="text-xs text-muted-foreground">{ts.importHint}</p>
      <div className="flex flex-col gap-2" role="radiogroup" aria-label={ts.importTitle}>
        {(["fill_empty", "overwrite", "keep"] as const).map((value) => (
          <label key={value} className="flex items-start gap-2">
            <input type="radio" name="sendit-import-mode" className="mt-1 accent-[var(--accent)]" checked={mode === value} onChange={() => setMode(value)} />
            <span>{ts.importModes[value]}</span>
          </label>
        ))}
      </div>
      {mode !== "keep" ? (
        <label className="flex items-center gap-2">
          <span>{ts.importExtra}</span>
          <Input dir="ltr" inputMode="decimal" className="w-24" value={extra} onChange={(e) => setExtra(e.target.value)} />
          <span className="text-muted-foreground">MAD</span>
        </label>
      ) : null}
      <label className="flex items-start gap-2">
        <input type="checkbox" className="mt-1 accent-[var(--accent)]" checked={addMissing} onChange={(e) => setAddMissing(e.target.checked)} />
        <span>{ts.importAddMissing}</span>
      </label>
      {error ? (
        <FormAlert>
          {t.errors[error.code]}
          {error.detail ? ` (${error.detail})` : ""}
        </FormAlert>
      ) : null}
      {result ? (
        <div className="rounded-md bg-success-soft p-2 text-success">
          <p>{interpolate(ts.importDone, { matched: result.matched, total: result.senditCities, fees: result.customerFeesSet })}</p>
          {result.unmatched.length ? <p className="mt-1 text-xs text-muted-foreground">{ts.importUnmatched} {result.unmatched.join("، ")}</p> : null}
        </div>
      ) : null}
      <Button
        variant="secondary"
        className="self-start"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            setResult(null);
            const extraMad = Number(extra.replace(",", ".")) || 0;
            const response = await importSenditRates({ customerFee: mode, extraMad, addMissing });
            if (response.error || !response.data) return setError({ code: response.error ?? "UNKNOWN", detail: response.detail });
            setResult(response.data);
            router.refresh();
          })
        }
      >
        <Download /> {pending ? ts.importRunning : ts.importButton}
      </Button>
    </div>
  );
}
