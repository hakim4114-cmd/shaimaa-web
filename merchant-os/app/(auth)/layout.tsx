import type { ReactNode } from "react";
import { AuthFrame } from "@/components/auth/auth-card";
import { getI18n } from "@/lib/i18n/server";

export default async function AuthLayout({ children }: { children: ReactNode }) {
  const { t } = await getI18n();
  return <AuthFrame appName={t.app.name}>{children}</AuthFrame>;
}
