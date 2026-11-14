"use client";

import { orderStatusTone, type OrderStatus } from "@/lib/domain/order-status";
import { useI18n } from "@/lib/i18n/provider";
import { Badge } from "./badge";

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const { t } = useI18n();
  return (
    <Badge tone={orderStatusTone[status]} dot>
      {t.orderStatus[status]}
    </Badge>
  );
}
