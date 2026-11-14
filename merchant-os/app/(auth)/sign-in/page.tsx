import { AuthHeading } from "@/components/auth/auth-card";
import { SignInForm } from "@/components/auth/auth-forms";
import { safeNextPath } from "@/lib/auth/schemas";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t.auth.signInTitle };
}

export default async function SignInPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { t } = await getI18n();
  const params = await searchParams;
  return (
    <>
      <AuthHeading title={t.auth.signInTitle} subtitle={t.auth.signInSubtitle} />
      <SignInForm next={safeNextPath(params.next)} initialError={params.error === "link" ? t.auth.linkFailed : undefined} />
    </>
  );
}
