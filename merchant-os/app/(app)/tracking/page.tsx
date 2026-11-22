import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { requireOrganization } from "@/lib/data/context";
import { listTrackedShipments } from "@/lib/data/shipping";
import { getI18n } from "@/lib/i18n/server";
import { compareTracking, trackedStatuses, type TrackedStatus } from "@/lib/orders/tracking";
import { TrackingBoard, type TrackedParcel } from "./tracking-board";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t.tracking.title };
}

/**
 * Delivery follow-up: every parcel with the courier, missed deliveries first.
 * One tap opens WhatsApp with the message that fits where the parcel is.
 */
export default async function TrackingPage() {
  const { t } = await getI18n();
  const { supabase, organizationId, organizationName, can } = await requireOrganization();
  if (!can.prepareOrders) redirect("/");
  const rows = await listTrackedShipments(supabase, organizationId, trackedStatuses);

  const parcels: TrackedParcel[] = rows
    .map((r) => ({
      shipmentId: r.id,
      orderId: r.orderId,
      orderNumber: r.orderNumber,
      name: can.seeContacts ? (r.customerName ?? r.orderNumber) : r.orderNumber,
      phone: can.seeContacts ? r.phone : null,
      city: r.city,
      status: r.status as TrackedStatus,
      carrierMessage: r.carrierMessage,
      tracking: r.trackingNumber,
      codCents: r.codAmountCents,
      since: r.carrierUpdatedAt ?? r.createdAt,
      shippedAt: r.createdAt,
      unreachable: r.unreachableCount
    }))
    .sort(compareTracking);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={t.tracking.title} description={t.tracking.description} />
      <TrackingBoard parcels={parcels} storeName={organizationName} />
    </div>
  );
}
