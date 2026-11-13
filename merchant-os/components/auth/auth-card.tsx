import type { ReactNode } from "react";
import { BrandMark } from "@/components/shell/brand-mark";
import { PreferencesMenu } from "@/components/shell/preferences-menu";

export function AuthFrame({ appName, children }: { appName: string; children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex h-14 items-center justify-between px-4 sm:px-6">
        <span className="flex items-center gap-2.5 text-sm font-semibold tracking-tight text-foreground">
          <BrandMark /> {appName}
        </span>
        <PreferencesMenu />
      </header>
      <main className="flex flex-1 items-start justify-center px-4 pb-16 pt-8 sm:pt-16">
        <div className="w-full max-w-sm">{children}</div>
      </main>
    </div>
  );
}

export function AuthHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-xl font-semibold tracking-tight text-foreground">{title}</h1>
      {subtitle ? <p className="mt-1.5 text-sm text-muted-foreground [overflow-wrap:anywhere]">{subtitle}</p> : null}
    </div>
  );
}
