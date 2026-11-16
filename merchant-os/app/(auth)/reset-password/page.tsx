import { redirect } from "next/navigation";
import { AuthHeading } from "@/components/auth/auth-card";
import { ResetPasswordForm } from "@/components/auth/auth-forms";
import { getSessionContext } from "@/lib/auth/session";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t.auth.resetTitle };
}

// Reached from the reset email (the link signs the user in first) or from the user menu.
export default async function ResetPasswordPage() {
  if (!(await getSessionContext())) {
    redirect("/sign-in");
  }
  const { t } = await getI18n();
  return (
    <>
      <AuthHeading title={t.auth.resetTitle} subtitle={t.auth.resetSubtitle} />
      <ResetPasswordForm />
    </>
  );
}
