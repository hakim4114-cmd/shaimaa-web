"use client";

import { CircleAlert } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n/provider";

// Shown when a page fails to load (e.g. the database is unreachable).
// Never displays the raw error: it may contain internal details.
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useI18n();
  useEffect(() => {
    console.error(error.digest ?? "page error");
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <span className="flex size-11 items-center justify-center rounded-lg bg-danger-soft text-danger">
        <CircleAlert className="size-5" aria-hidden />
      </span>
      <div>
        <h1 className="text-lg font-semibold text-foreground">{t.common.errorTitle}</h1>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">{t.common.errorDescription}</p>
        {error.digest ? <p className="tabular mt-2 text-xs text-subtle-foreground">#{error.digest}</p> : null}
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <Button onClick={reset}>{t.common.retry}</Button>
        <Link href="/" className={buttonVariants({ variant: "secondary" })}>
          {t.common.goHome}
        </Link>
      </div>
    </div>
  );
}
