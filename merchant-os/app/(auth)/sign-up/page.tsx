import { AuthHeading } from "@/components/auth/auth-card";
import { SignUpForm } from "@/components/auth/auth-forms";
import { signupOpen } from "@/lib/auth/signup";
import { getI18n } from "@/lib/i18n/server";
import Link from "next/link";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t.auth.signUpTitle };
}

export default async function SignUpPage() {
  const { t } = await getI18n();
  if (!signupOpen) {
    return (
      <>
        <AuthHeading title={t.auth.signupClosedTitle} subtitle={t.auth.signupClosedText} />
        <Link href="/sign-in" className="text-center text-sm font-medium text-accent hover:underline">
          {t.auth.signInButton}
        </Link>
      </>
    );
  }
  return (
    <>
      <AuthHeading title={t.auth.signUpTitle} subtitle={t.auth.signUpSubtitle} />
      <SignUpForm />
    </>
  );
}
