"use client";

import { Download, Upload } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { FormAlert } from "@/components/auth/form-alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { NativeSelect } from "@/components/ui/input";
import { parseCsv } from "@/lib/export/table";
import { readImport, type ImportIssue, type ImportOrder } from "@/lib/import/orders";
import { interpolate } from "@/lib/i18n/dictionaries";
import { useI18n } from "@/lib/i18n/provider";
import { orderSources } from "@/lib/orders/calls";
import { importOrders, type ImportResult } from "./actions";

export function ImportClient() {
  const { t } = useI18n();
  const ti = t.imports;
  const [orders, setOrders] = useState<ImportOrder[] | null>(null);
  const [issues, setIssues] = useState<ImportIssue[]>([]);
  const [source, setSource] = useState("other");
  const [results, setResults] = useState<ImportResult[] | null>(null);
  const [pending, startTransition] = useTransition();
  const [failed, setFailed] = useState(false);

  async function onFile(file: File | undefined) {
    setResults(null);
    if (!file) return;
    if (file.size > 2_000_000) {
      setIssues([{ row: 0, code: "COLUMNS_MISSING" }]);
      return;
    }
    const parsed = readImport(parseCsv(await file.text()));
    setOrders(parsed.orders);
    setIssues(parsed.issues);
  }

  const created = results?.filter((r) => r.orderNumber).length ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader title={ti.step1} description={ti.step1Hint} />
        <CardBody className="flex flex-wrap gap-2">
          <a href="/api/import-template" className={buttonVariants({ variant: "secondary" })}>
            <Download /> {ti.template}
          </a>
        </CardBody>
      </Card>
      <Card>
        <CardHeader title={ti.step2} description={ti.step2Hint} />
        <CardBody className="flex flex-col gap-4">
          <label className={buttonVariants({ className: "w-fit cursor-pointer" })}>
            <Upload /> {ti.choose}
            <input type="file" accept=".csv,text/csv" className="sr-only" onChange={(e) => void onFile(e.target.files?.[0])} />
          </label>
          {issues.length > 0 ? (
            <FormAlert>
              <span className="block font-medium">{interpolate(ti.issues, { count: issues.length })}</span>
              {issues.slice(0, 20).map((issue, index) => (
                <span key={index} className="block">
                  {issue.row ? `${ti.line} ${issue.row}: ` : ""}
                  {ti.issueCodes[issue.code]}
                </span>
              ))}
            </FormAlert>
          ) : null}
          {orders && orders.length > 0 && issues.length === 0 && !results ? (
            <>
              <p className="text-sm">{interpolate(ti.ready, { orders: orders.length, lines: orders.reduce((s, o) => s + o.rows.length, 0) })}</p>
              <ul className="max-h-60 divide-y divide-border overflow-y-auto rounded-md text-sm ring-1 ring-border">
                {orders.slice(0, 100).map((o) => (
                  <li key={o.ref} className="flex justify-between gap-3 px-3 py-2">
                    <span className="min-w-0 truncate">
                      {o.fullName} · <span dir="ltr">{o.phone}</span> · {o.city || "—"}
                    </span>
                    <span className="shrink-0 text-muted-foreground">{o.items.map((i) => `${i.sku}×${i.quantity}`).join(", ")}</span>
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap items-end gap-2">
                <label className="flex flex-col gap-1 text-sm">
                  <span className="font-medium">{t.orders.source}</span>
                  <NativeSelect value={source} onChange={(e) => setSource(e.target.value)} className="w-56">
                    {orderSources.map((s) => (
                      <option key={s} value={s}>
                        {t.orderSource[s]}
                      </option>
                    ))}
                  </NativeSelect>
                </label>
                <Button
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      setFailed(false);
                      const result = await importOrders(orders, source);
                      if (result.error) return setFailed(true);
                      setResults(result.results ?? []);
                    })
                  }
                >
                  {pending ? t.common.loading : interpolate(ti.import, { count: orders.length })}
                </Button>
              </div>
              {failed ? <FormAlert>{t.errors.UNKNOWN}</FormAlert> : null}
            </>
          ) : null}
          {results ? (
            <div className="flex flex-col gap-2 text-sm">
              <p className="font-medium text-success">{interpolate(ti.done, { created, total: results.length })}</p>
              {results
                .filter((r) => r.error)
                .map((r) => (
                  <p key={r.ref} className="text-danger">
                    {ti.line} {r.rows.join(", ")}: {t.errors[r.error!]}
                    {r.detail ? ` (${r.detail})` : ""}
                  </p>
                ))}
              <Link href="/orders?view=to_call" className={buttonVariants({ variant: "secondary", className: "w-fit" })}>
                {t.orders.views.to_call}
              </Link>
            </div>
          ) : null}
        </CardBody>
      </Card>
    </div>
  );
}
