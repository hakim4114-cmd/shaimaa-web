"use client";

import { Check, Copy, Pause, Play, Plus, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createStoreConnection, renewStoreSecret, setStoreActive } from "@/app/(app)/settings/store-actions";
import { FormAlert } from "@/components/auth/form-alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect } from "@/components/ui/input";
import type { AppErrorCode } from "@/lib/data/errors";
import { formatDateTime } from "@/lib/datetime";
import { useI18n } from "@/lib/i18n/provider";
import { connectablePlatforms, type StorePlatform } from "@/lib/integrations/stores";

export type StoreRow = { id: string; name: string; platform: StorePlatform; active: boolean; lastOrderAt: string | null };
type Connectable = (typeof connectablePlatforms)[number];

function CopyField({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center gap-2">
      <code dir="ltr" className="min-w-0 flex-1 truncate rounded bg-surface px-2 py-1.5 text-xs ring-1 ring-border">
        {value}
      </code>
      <Button
        variant="secondary"
        size="icon-sm"
        aria-label={label}
        onClick={() => void navigator.clipboard.writeText(value).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); })}
      >
        {copied ? <Check /> : <Copy />}
      </Button>
    </div>
  );
}

export function StoreConnections({ stores, origin }: { stores: StoreRow[]; origin: string }) {
  const { t, locale } = useI18n();
  const ts = t.stores;
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<AppErrorCode | null>(null);
  const [adding, setAdding] = useState(false);
  const [platform, setPlatform] = useState<Connectable>("shopify");
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [secret, setSecret] = useState("");
  // Shown once after creating a connection or renewing a secret.
  const [reveal, setReveal] = useState<{ storeId: string; platform: StorePlatform; secret?: string } | null>(null);

  const webhookUrl = (id: string) => `${origin}/api/webhooks/store/${id}`;
  const steps = (p: StorePlatform) => (p === "shopify" ? ts.stepsShopify : p === "woocommerce" ? ts.stepsWoo : ts.stepsCustom);

  return (
    <div className="flex flex-col gap-4 text-sm">
      {error ? <FormAlert>{t.errors[error]}</FormAlert> : null}

      {reveal ? (
        <div className="flex flex-col gap-3 rounded-md bg-warning-soft p-3">
          <p className="font-medium text-warning">{ts.setupNow}</p>
          <span className="font-medium">{ts.webhookUrl}</span>
          <CopyField value={webhookUrl(reveal.storeId)} label={t.shipping.copy} />
          {reveal.secret ? (
            <>
              <span className="font-medium">{ts.secret}</span>
              <CopyField value={reveal.secret} label={t.shipping.copy} />
              <p className="text-xs text-warning">{ts.secretOnce}</p>
            </>
          ) : null}
          <ol className="list-inside list-decimal space-y-1">
            {steps(reveal.platform).map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <Button variant="secondary" className="self-start" onClick={() => setReveal(null)}>
            {ts.done}
          </Button>
        </div>
      ) : null}

      {stores.length > 0 ? (
        <ul className="divide-y divide-border rounded-md ring-1 ring-border">
          {stores.map((store) => (
            <li key={store.id} className="flex flex-col gap-2 px-3 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{store.name}</span>
                <Badge tone="neutral">{ts.platforms[store.platform]}</Badge>
                <Badge tone={store.active ? "success" : "warning"} dot>
                  {store.active ? ts.active : ts.paused}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {store.lastOrderAt ? `${ts.lastOrder} ${formatDateTime(store.lastOrderAt, locale, "short")}` : ts.noOrderYet}
                </span>
              </div>
              <CopyField value={webhookUrl(store.id)} label={t.shipping.copy} />
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      setError(null);
                      const result = await setStoreActive(store.id, !store.active);
                      if (result.error) return setError(result.error);
                      router.refresh();
                    })
                  }
                >
                  {store.active ? <Pause /> : <Play />} {store.active ? ts.pause : ts.resume}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      setError(null);
                      let pasted: string | undefined;
                      if (store.platform === "shopify") {
                        pasted = window.prompt(ts.shopifySecret) ?? undefined;
                        if (!pasted) return;
                      }
                      const result = await renewStoreSecret(store.id, pasted);
                      if (result.error) return setError(result.error);
                      setReveal({ storeId: store.id, platform: store.platform, secret: result.secret });
                    })
                  }
                >
                  <RefreshCw /> {ts.renewSecret}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground">{ts.empty}</p>
      )}

      {adding ? (
        <form
          className="flex flex-col gap-3 rounded-md p-3 ring-1 ring-border"
          onSubmit={(event) => {
            event.preventDefault();
            startTransition(async () => {
              setError(null);
              const result = await createStoreConnection({ name, platform, url, secret });
              if (result.error || !result.id) return setError(result.error ?? "UNKNOWN");
              setReveal({ storeId: result.id, platform, secret: result.secret });
              setAdding(false);
              setName("");
              setUrl("");
              setSecret("");
              router.refresh();
            });
          }}
        >
          <label className="flex flex-col gap-1">
            <span className="font-medium">{ts.platform}</span>
            <NativeSelect value={platform} onChange={(e) => setPlatform(e.target.value as Connectable)}>
              {connectablePlatforms.map((p) => (
                <option key={p} value={p}>
                  {ts.platforms[p]}
                </option>
              ))}
            </NativeSelect>
          </label>
          <label className="flex flex-col gap-1">
            <span className="font-medium">{ts.name}</span>
            <Input value={name} required maxLength={120} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="font-medium">{ts.url}</span>
            <Input dir="ltr" type="url" value={url} maxLength={300} placeholder="https://" onChange={(e) => setUrl(e.target.value)} />
          </label>
          {platform === "shopify" ? (
            <label className="flex flex-col gap-1">
              <span className="font-medium">{ts.shopifySecret}</span>
              <Input dir="ltr" value={secret} required minLength={16} maxLength={200} onChange={(e) => setSecret(e.target.value)} />
              <span className="text-xs text-muted-foreground">{ts.shopifySecretHint}</span>
            </label>
          ) : (
            <p className="text-xs text-muted-foreground">{ts.secretGenerated}</p>
          )}
          <div className="flex gap-2">
            <Button type="submit" disabled={pending}>
              {ts.connect}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setAdding(false)}>
              {t.common.cancel}
            </Button>
          </div>
        </form>
      ) : (
        <Button variant="secondary" className="self-start" onClick={() => setAdding(true)}>
          <Plus /> {ts.add}
        </Button>
      )}

      <ul className="list-inside list-disc space-y-1 text-xs text-muted-foreground">
        <li>{ts.ruleNew}</li>
        <li>{ts.ruleSku}</li>
        <li>{ts.youcanSoon}</li>
      </ul>
    </div>
  );
}
