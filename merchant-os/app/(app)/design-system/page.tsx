import { notFound } from "next/navigation";
import { DesignSystemShowcase } from "@/components/design-system-showcase";
import { isDevelopment } from "@/lib/env";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t.designSystem.title };
}

// Internal reference page. Example values here are illustrative and never
// reachable in production builds.
export default function DesignSystemPage() {
  if (!isDevelopment) {
    notFound();
  }
  return <DesignSystemShowcase />;
}
