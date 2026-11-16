"use client";

import { Building2, KeyRound, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { signOut } from "@/app/(auth)/actions";
import { switchOrganization } from "@/app/onboarding/actions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { useI18n } from "@/lib/i18n/provider";

export type ShellAccount = {
  email: string;
  activeOrganizationId: string;
  memberships: { role: keyof ReturnType<typeof useI18n>["t"]["userMenu"]["role"]; organization: { id: string; name: string } }[];
};

export function UserMenu({ account }: { account: ShellAccount }) {
  const { t } = useI18n();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const active = account.memberships.find((m) => m.organization.id === account.activeOrganizationId);
  const initial = (account.email.trim()[0] ?? "?").toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="ms-1 flex size-8 pointer-coarse:size-10 items-center justify-center rounded-full bg-accent-soft text-xs font-semibold text-accent-soft-foreground ring-offset-2 transition hover:ring-2 hover:ring-border-strong"
        aria-label={t.userMenu.account}
        disabled={pending}
      >
        {initial}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <div className="px-2 py-2">
          <p className="truncate text-sm font-medium text-foreground" dir="ltr">
            {account.email}
          </p>
          {active ? (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {active.organization.name} · {t.userMenu.role[active.role]}
            </p>
          ) : null}
        </div>
        {account.memberships.length > 1 ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>{t.userMenu.organizations}</DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={account.activeOrganizationId}
              onValueChange={(id) =>
                startTransition(async () => {
                  await switchOrganization(id);
                  router.refresh();
                })
              }
            >
              {account.memberships.map((m) => (
                <DropdownMenuRadioItem key={m.organization.id} value={m.organization.id}>
                  <Building2 /> <span className="truncate">{m.organization.name}</span>
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => router.push("/reset-password")}>
          <KeyRound /> {t.auth.changePassword}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => startTransition(() => signOut())}>
          <LogOut className="rtl:rotate-180" /> {t.auth.signOut}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
