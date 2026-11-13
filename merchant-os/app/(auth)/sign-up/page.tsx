import { AuthHeading } from "@/components/auth/auth-card";
import { SignUpForm } from "@/components/auth/auth-forms";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t.auth.signUpTitle };
}

export default async function SignUpPage() {
  const { t } = await getI18n();
  return (
    <>
      <AuthHeading title={t.auth.signUpTitle} subtitle={t.auth.signUpSubtitle} />
      <SignUpForm />
    </>
  );
}
