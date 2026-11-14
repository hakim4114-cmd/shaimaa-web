import { redirect } from "next/navigation";
import { AuthFrame, AuthHeading } from "@/components/auth/auth-card";
import { OnboardingForm } from "@/components/auth/onboarding-form";
import { getSessionContext } from "@/lib/auth/session";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t.onboarding.title };
}

export default async function OnboardingPage() {
  const session = await getSessionContext();
  if (!session) {
    redirect("/sign-in");
  }
  if (session.active) {
    redirect("/");
  }
  const { t } = await getI18n();
  return (
    <AuthFrame appName={t.app.name}>
      <AuthHeading title={t.onboarding.title} subtitle={t.onboarding.subtitle} />
      <OnboardingForm />
    </AuthFrame>
  );
}
