"use client";

import { Check, Copy, KeyRound, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createAssistantLink, revokeAssistantLink } from "@/app/(app)/settings/assistant-actions";
import { FormAlert } from "@/components/auth/form-alert";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import type { AppErrorCode } from "@/lib/data/errors";
import { formatDateTime } from "@/lib/datetime";
import { useI18n } from "@/lib/i18n/provider";

export function AssistantLinks({ links }: { links: { id: string; name: string; createdAt: string; lastUsedAt: string | null }[] }) {
  const { t, locale } = useI18n();
  const ta = t.assistant;
  const router = useRouter();
  const [name, setName] = useState("Claude");
  const [url, setUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<AppErrorCode | null>(null);

  return (
    <div className="flex flex-col gap-4 text-sm">
      {error ? <FormAlert>{t.errors[error]}</FormAlert> : null}
      <ol className="list-inside list-decimal space-y-1 text-muted-foreground">
        <li>{ta.step1}</li>
        <li>{ta.step2}</li>
        <li>{ta.step3}</li>
      </ol>
      {url ? (
        <div className="flex flex-col gap-2 rounded-md bg-warning-soft p-3">
          <p className="font-medium text-warning">{ta.copyNow}</p>
          <div className="flex items-center gap-2">
            <code dir="ltr" className="min-w-0 flex-1 truncate rounded bg-surface px-2 py-1.5 text-xs ring-1 ring-border">
              {url}
            </code>
            <Button
              variant="secondary"
              size="icon-sm"
              aria-label={t.shipping.copy}
              onClick={() => void navigator.clipboard.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); })}
            >
              {copied ? <Check /> : <Copy />}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1">
            <span className="font-medium">{ta.linkName}</span>
            <Input value={name} maxLength={60} className="w-48" onChange={(e) => setName(e.target.value)} />
          </label>
          <Button
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                setError(null);
                const result = await createAssistantLink(name);
                if (result.error || !result.url) return setError(result.error ?? "UNKNOWN");
                setUrl(result.url);
                router.refresh();
              })
            }
          >
            <KeyRound /> {ta.create}
          </Button>
        </div>
      )}
      {links.length > 0 ? (
        <ul className="divide-y divide-border rounded-md ring-1 ring-border">
          {links.map((link) => (
            <li key={link.id} className="flex items-center justify-between gap-3 px-3 py-2">
              <span className="min-w-0">
                <span className="font-medium">{link.name}</span>
                <span className="block text-xs text-muted-foreground">
                  {formatDateTime(link.createdAt, locale, "short")} · {link.lastUsedAt ? `${ta.lastUsed} ${formatDateTime(link.lastUsedAt, locale, "short")}` : ta.neverUsed}
                </span>
              </span>
              <ConfirmDialog
                trigger={
                  <Button variant="ghost" size="icon-sm" aria-label={ta.revoke}>
                    <Trash2 />
                  </Button>
                }
                title={ta.revoke}
                description={ta.revokeHint}
                confirmLabel={ta.revoke}
                cancelLabel={t.common.cancel}
                onConfirm={async () => {
                  await revokeAssistantLink(link.id);
                  router.refresh();
                }}
              />
            </li>
          ))}
        </ul>
      ) : null}
      <p className="text-xs text-muted-foreground">{ta.privacy}</p>
    </div>
  );
}
