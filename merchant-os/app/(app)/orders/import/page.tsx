import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { requireOrganization } from "@/lib/data/context";
import { getI18n } from "@/lib/i18n/server";
import { ImportClient } from "./import-client";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t.imports.title };
}

export default async function ImportOrdersPage() {
  const { t } = await getI18n();
  const { can } = await requireOrganization();
  if (!can.manageOrders) redirect("/orders");
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <PageHeader title={t.imports.title} description={t.imports.description} />
      <ImportClient />
    </div>
  );
}
