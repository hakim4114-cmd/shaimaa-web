"use client";

import { Check, Copy, PlugZap } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { toast } from "sonner";
import { saveSenditKeys, saveSenditSettings, testSenditConnection } from "@/app/(app)/shipping/actions";
import { FormAlert } from "@/components/auth/form-alert";
import { Button } from "@/components/ui/button";
import { Field, Input, NativeSelect } from "@/components/ui/input";
import type { AppErrorCode } from "@/lib/data/errors";
import { useI18n } from "@/lib/i18n/provider";

type Initial = {
  active: boolean;
  pickupDistrictId: number | null;
  pickupCity: string;
  pickupName: string;
  pickupPhone: string;
  pickupAddress: string;
  allowOpen: boolean;
  allowTry: boolean;
};

export function SenditSettingsForm({ initial, keysConfigured, webhookUrl }: { initial: Initial; keysConfigured: boolean; webhookUrl: string | null }) {
  const { t, locale } = useI18n();
  const ts = t.shipping;
  const id = useId();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<{ code: AppErrorCode; detail?: string } | null>(null);
  const [cities, setCities] = useState<{ id: number; name: string; arabicName: string }[] | null>(null);
  const [value, setValue] = useState(initial);
  const [copied, setCopied] = useState(false);
  const [editingKeys, setEditingKeys] = useState(!keysConfigured);
  const [publicKey, setPublicKey] = useState("");
  const [secretKey, setSecretKey] = useState("");

  function saveKeys(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await saveSenditKeys({ publicKey, secretKey });
      if (result.error) {
        setError({ code: result.error, detail: result.detail });
        return;
      }
      setPublicKey("");
      setSecretKey("");
      setEditingKeys(false);
      toast.success(ts.keysSaved);
      router.refresh();
    });
  }

  function test() {
    setError(null);
    startTransition(async () => {
      const result = await testSenditConnection();
      if (result.error || !result.data) {
        setError({ code: result.error ?? "UNKNOWN", detail: result.detail });
        return;
      }
      setCities(result.data);
      toast.success(ts.connectionOk);
      if (!value.pickupDistrictId) {
        const kenitra = result.data.find((city) => /k[ée]nitra/i.test(city.name));
        if (kenitra) setValue((v) => ({ ...v, pickupDistrictId: kenitra.id, pickupCity: kenitra.name }));
      }
    });
  }

  function save(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await saveSenditSettings({ ...value, pickupDistrictId: value.pickupDistrictId ?? 0 });
      if (result.error) {
        setError({ code: result.error, detail: result.detail });
        return;
      }
      toast.success(ts.saved);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-5">
      {error ? (
        <FormAlert>
          {t.errors[error.code]}
          {error.detail ? ` (${error.detail})` : ""}
        </FormAlert>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <span className={keysConfigured ? "text-sm font-medium text-success" : "text-sm font-medium text-warning"}>
          {keysConfigured ? ts.keysConfigured : ts.keysMissing}
        </span>
        <Button variant="secondary" size="sm" onClick={test} disabled={pending || !keysConfigured}>
          <PlugZap /> {ts.testConnection}
        </Button>
        {keysConfigured && !editingKeys ? (
          <Button variant="ghost" size="sm" onClick={() => setEditingKeys(true)}>
            {ts.changeKeys}
          </Button>
        ) : null}
      </div>
      {editingKeys ? (
        <form onSubmit={saveKeys} className="grid gap-3 rounded-md bg-surface-muted p-3 sm:grid-cols-2">
          <p className="text-sm text-muted-foreground sm:col-span-2">{ts.keysHelp}</p>
          <Field label={ts.publicKey} htmlFor={`${id}-pk`}>
            <Input id={`${id}-pk`} dir="ltr" autoComplete="off" spellCheck={false} value={publicKey} maxLength={300} onChange={(e) => setPublicKey(e.target.value)} />
          </Field>
          <Field label={ts.secretKey} htmlFor={`${id}-sk`}>
            <Input id={`${id}-sk`} dir="ltr" type="password" autoComplete="new-password" value={secretKey} maxLength={300} onChange={(e) => setSecretKey(e.target.value)} />
          </Field>
          <div className="flex gap-2 sm:col-span-2">
            <Button type="submit" disabled={pending || publicKey.trim().length < 8 || secretKey.trim().length < 8}>
              {ts.saveKeys}
            </Button>
            {keysConfigured ? (
              <Button type="button" variant="ghost" onClick={() => setEditingKeys(false)}>
                {t.common.cancel}
              </Button>
            ) : null}
          </div>
        </form>
      ) : null}

      <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
        <Field label={ts.pickupCity} htmlFor={`${id}-city`} hint={cities ? undefined : ts.pickupCityHint}>
          {cities ? (
            <NativeSelect
              id={`${id}-city`}
              value={value.pickupDistrictId ?? ""}
              onChange={(e) => {
                const city = cities.find((c) => c.id === Number(e.target.value));
                setValue((v) => ({ ...v, pickupDistrictId: city?.id ?? null, pickupCity: city?.name ?? "" }));
              }}
            >
              <option value="">—</option>
              {cities.map((city) => (
                <option key={city.id} value={city.id}>
                  {locale === "ar" && city.arabicName ? city.arabicName : city.name}
                </option>
              ))}
            </NativeSelect>
          ) : (
            <Input id={`${id}-city`} value={value.pickupCity || "—"} readOnly />
          )}
        </Field>
        <Field label={ts.pickupName} htmlFor={`${id}-name`}>
          <Input id={`${id}-name`} value={value.pickupName} maxLength={120} onChange={(e) => setValue((v) => ({ ...v, pickupName: e.target.value }))} />
        </Field>
        <Field label={ts.pickupPhone} htmlFor={`${id}-phone`}>
          <Input id={`${id}-phone`} type="tel" dir="ltr" value={value.pickupPhone} onChange={(e) => setValue((v) => ({ ...v, pickupPhone: e.target.value }))} />
        </Field>
        <Field label={ts.pickupAddress} htmlFor={`${id}-address`}>
          <Input id={`${id}-address`} value={value.pickupAddress} maxLength={250} onChange={(e) => setValue((v) => ({ ...v, pickupAddress: e.target.value }))} />
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="size-5 accent-[var(--accent)]" checked={value.allowOpen} onChange={(e) => setValue((v) => ({ ...v, allowOpen: e.target.checked }))} />
          {ts.allowOpen}
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="size-5 accent-[var(--accent)]" checked={value.allowTry} onChange={(e) => setValue((v) => ({ ...v, allowTry: e.target.checked }))} />
          {ts.allowTry}
        </label>
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input type="checkbox" className="size-5 accent-[var(--accent)]" checked={value.active} onChange={(e) => setValue((v) => ({ ...v, active: e.target.checked }))} />
          {ts.enableSendit}
        </label>
        <div className="sm:col-span-2">
          <Button type="submit" disabled={pending || !value.pickupDistrictId}>
            {pending ? t.common.loading : t.common.save}
          </Button>
          {!value.pickupDistrictId ? <p className="mt-2 text-xs text-muted-foreground">{ts.saveNeedsCity}</p> : null}
        </div>
      </form>

      {webhookUrl ? (
        <div className="rounded-md bg-surface-muted p-4 text-sm">
          <p className="font-medium">{ts.webhookTitle}</p>
          <p className="mt-1 text-muted-foreground">{ts.webhookHelp}</p>
          <div className="mt-3 flex items-center gap-2">
            <code dir="ltr" className="min-w-0 flex-1 truncate rounded bg-surface px-2 py-1.5 text-xs ring-1 ring-border">
              {webhookUrl}
            </code>
            <Button
              variant="secondary"
              size="icon-sm"
              aria-label={ts.copy}
              onClick={() => {
                void navigator.clipboard.writeText(webhookUrl).then(() => {
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                });
              }}
            >
              {copied ? <Check /> : <Copy />}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
