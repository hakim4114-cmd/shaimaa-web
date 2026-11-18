"use client";

import { EyeOff, RotateCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import type { AppErrorCode } from "@/lib/data/errors";
import { useI18n } from "@/lib/i18n/provider";
import { ignoreStoreOrder, retryStoreOrder } from "./actions";

export function InboxActions({ id }: { id: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const run = (action: () => Promise<{ status?: string; error?: AppErrorCode }>) =>
    startTransition(async () => {
      setMessage(null);
      const result = await action();
      if (result.error) return setMessage(t.errors[result.error]);
      if (result.status === "needs_attention") return setMessage(t.storeInbox.stillWaiting);
      router.refresh();
    });

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        <Button size="sm" variant="secondary" disabled={pending} onClick={() => run(() => retryStoreOrder(id))}>
          <RotateCw /> {t.storeInbox.retry}
        </Button>
        <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(() => ignoreStoreOrder(id))}>
          <EyeOff /> {t.storeInbox.ignore}
        </Button>
      </div>
      {message ? <p className="text-xs text-danger">{message}</p> : null}
    </div>
  );
}
