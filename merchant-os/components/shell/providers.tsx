"use client";

import { ThemeProvider } from "next-themes";
import { Direction } from "radix-ui";
import type { ReactNode } from "react";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { Locale } from "@/lib/i18n/config";
import { localeDirection } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { I18nProvider } from "@/lib/i18n/provider";

export function Providers({ locale, t, children }: { locale: Locale; t: Dictionary; children: ReactNode }) {
  const dir = localeDirection[locale];
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <I18nProvider locale={locale} t={t}>
        <Direction.Provider dir={dir}>
          <TooltipProvider delayDuration={300}>
            {children}
            <Toaster
              position={dir === "rtl" ? "bottom-left" : "bottom-right"}
              dir={dir}
              toastOptions={{
                classNames: {
                  toast: "!rounded-lg !border !border-border !bg-surface !text-foreground !shadow-popover",
                  description: "!text-muted-foreground"
                }
              }}
            />
          </TooltipProvider>
        </Direction.Provider>
      </I18nProvider>
    </ThemeProvider>
  );
}
