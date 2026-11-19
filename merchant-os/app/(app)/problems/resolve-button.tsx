"use client";

import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n/provider";
import { resolveProblem } from "./actions";

export function ResolveButton({ id }: { id: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      size="sm"
      variant="secondary"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await resolveProblem(id);
          router.refresh();
        })
      }
    >
      <Check /> {t.problems.resolve}
    </Button>
  );
}
