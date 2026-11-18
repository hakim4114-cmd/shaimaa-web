"use client";

import { Languages, Monitor, Moon, SlidersHorizontal, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { setLocale } from "@/lib/i18n/actions";
import { locales, localeNativeName } from "@/lib/i18n/config";
import { useI18n } from "@/lib/i18n/provider";
import { navModeCookieName } from "@/lib/shell";

function readNavMode(): "essential" | "full" {
  if (typeof document === "undefined") return "essential";
  return document.cookie.split("; ").some((c) => c === `${navModeCookieName}=full`) ? "full" : "essential";
}

export function PreferencesMenu() {
  const { t, locale } = useI18n();
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [navMode, setNavMode] = useState<"essential" | "full">(readNavMode);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={t.topbar.preferences} disabled={pending}>
          <SlidersHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>{t.topbar.theme}</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={theme ?? "system"} onValueChange={setTheme}>
          <DropdownMenuRadioItem value="light">
            <Sun /> {t.topbar.themeLight}
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark">
            <Moon /> {t.topbar.themeDark}
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="system">
            <Monitor /> {t.topbar.themeSystem}
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="flex items-center gap-1.5">
          <Languages className="size-3.5" aria-hidden /> {t.topbar.language}
        </DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={locale}
          onValueChange={(next) =>
            startTransition(async () => {
              await setLocale(next);
              router.refresh();
            })
          }
        >
          {locales.map((code) => (
            <DropdownMenuRadioItem key={code} value={code} lang={code}>
              {localeNativeName[code]}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>{t.topbar.sections}</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={navMode}
          onValueChange={(next) => {
            const mode = next === "full" ? "full" : "essential";
            setNavMode(mode);
            document.cookie = `${navModeCookieName}=${mode}; path=/; max-age=31536000; samesite=lax`;
            router.refresh();
          }}
        >
          <DropdownMenuRadioItem value="essential">{t.topbar.sectionsEssential}</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="full">{t.topbar.sectionsAll}</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
