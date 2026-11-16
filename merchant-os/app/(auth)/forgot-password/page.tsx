import { AuthHeading } from "@/components/auth/auth-card";
import { ForgotPasswordForm } from "@/components/auth/auth-forms";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t.auth.forgotTitle };
}

export default async function ForgotPasswordPage() {
  const { t } = await getI18n();
  return (
    <>
      <AuthHeading title={t.auth.forgotTitle} subtitle={t.auth.forgotSubtitle} />
      <ForgotPasswordForm />
    </>
  );
}
