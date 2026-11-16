"use client";

import { X } from "lucide-react";
import { Dialog as DialogPrimitive } from "radix-ui";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

export function DialogContent({
  className,
  children,
  closeLabel,
  variant = "center",
  ...props
}: ComponentProps<typeof DialogPrimitive.Content> & { closeLabel?: string; variant?: "center" | "sheet" }) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-overlay data-[state=open]:animate-fade-in" />
      <DialogPrimitive.Content
        className={cn(
          "fixed z-50 border-border bg-surface shadow-popover focus:outline-none",
          variant === "center"
            ? "inset-x-4 top-[12vh] mx-auto max-w-lg rounded-lg border p-6 data-[state=open]:animate-scale-in"
            : // The sheet is the mobile app frame: same dark surface as the desktop sidebar.
              "inset-y-0 start-0 w-72 max-w-[85vw] overflow-y-auto border-e border-sidebar-border bg-sidebar text-sidebar-foreground data-[state=open]:animate-fade-in",
          className
        )}
        {...props}
      >
        {children}
        {closeLabel ? (
          <DialogPrimitive.Close
            className={cn(
              "absolute end-3 top-3 inline-flex size-8 items-center justify-center rounded-md transition-colors pointer-coarse:size-11",
              variant === "sheet"
                ? "text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-foreground"
                : "text-muted-foreground hover:bg-surface-hover hover:text-foreground"
            )}
            aria-label={closeLabel}
          >
            <X className="size-4" />
          </DialogPrimitive.Close>
        ) : null}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export function DialogTitle({ className, ...props }: ComponentProps<typeof DialogPrimitive.Title>) {
  return <DialogPrimitive.Title className={cn("text-base font-semibold text-foreground", className)} {...props} />;
}

export function DialogDescription({ className, ...props }: ComponentProps<typeof DialogPrimitive.Description>) {
  return <DialogPrimitive.Description className={cn("mt-2 text-sm text-muted-foreground", className)} {...props} />;
}

export function DialogFooter({ children }: { children: ReactNode }) {
  return <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">{children}</div>;
}
