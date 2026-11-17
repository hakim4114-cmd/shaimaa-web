"use client";

import { ImagePlus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { removeProductImage, uploadProductImage } from "@/app/(app)/products/actions";
import { FormAlert } from "@/components/auth/form-alert";
import { Button, buttonVariants } from "@/components/ui/button";
import type { AppErrorCode } from "@/lib/data/errors";
import { useI18n } from "@/lib/i18n/provider";

/** Resizes in the browser (max 1200 px, WebP) so uploads stay small on mobile data. */
async function resize(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1200 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) => canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("resize"))), "image/webp", 0.85));
}

export function ProductImage({ productId, url, canEdit }: { productId: string; url: string | null; canEdit: boolean }) {
  const { t } = useI18n();
  const tp = t.products;
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<AppErrorCode | null>(null);

  return (
    <div className="flex flex-col gap-3">
      {error ? <FormAlert>{t.errors[error]}</FormAlert> : null}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex size-28 items-center justify-center overflow-hidden rounded-lg bg-surface-muted ring-1 ring-border">
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element -- signed, short-lived URL from private storage
            <img src={url} alt="" className="size-full object-cover" />
          ) : (
            <ImagePlus className="size-8 text-subtle-foreground" aria-hidden />
          )}
        </div>
        {canEdit ? (
          <div className="flex flex-col gap-2">
            <label className={buttonVariants({ variant: "secondary", className: "cursor-pointer" })}>
              <ImagePlus /> {url ? tp.replaceImage : tp.addImage}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                disabled={pending}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (!file) return;
                  setError(null);
                  startTransition(async () => {
                    try {
                      const blob = await resize(file);
                      const form = new FormData();
                      form.append("file", new File([blob], "image.webp", { type: "image/webp" }));
                      const result = await uploadProductImage(productId, form);
                      if (result.error) return setError(result.error);
                      router.refresh();
                    } catch {
                      setError("IMAGE_INVALID");
                    }
                  });
                }}
              />
            </label>
            {url ? (
              <Button
                variant="ghost"
                size="sm"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    const result = await removeProductImage(productId);
                    if (result.error) return setError(result.error);
                    router.refresh();
                  })
                }
              >
                <Trash2 /> {tp.removeImage}
              </Button>
            ) : null}
            {pending ? <span className="text-xs text-muted-foreground">{t.common.loading}</span> : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
