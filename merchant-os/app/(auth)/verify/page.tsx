import { redirect } from "next/navigation";
import { AuthHeading } from "@/components/auth/auth-card";
import { ResendConfirmation } from "@/components/auth/auth-forms";
import { emailSchema, safeNextPath } from "@/lib/auth/schemas";
import { interpolate } from "@/lib/i18n/dictionaries";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t.auth.verifyTitle };
}

export default async function VerifyPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { t } = await getI18n();
  const params = await searchParams;
  const email = emailSchema.safeParse(params.email);
  if (!email.success) {
    redirect("/sign-up");
  }
  return (
    <>
      <AuthHeading title={t.auth.verifyTitle} subtitle={interpolate(t.auth.verifySubtitle, { email: email.data })} />
      <ResendConfirmation email={email.data} next={safeNextPath(params.next)} />
    </>
  );
}
