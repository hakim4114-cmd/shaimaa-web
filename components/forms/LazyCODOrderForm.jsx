"use client";

import dynamic from "next/dynamic";

export const LazyCODOrderForm = dynamic(
  () => import("@/components/forms/CODOrderForm").then((module) => module.CODOrderForm),
  {
    ssr: false,
    loading: () => <div className="min-h-96 bg-ivory p-5 shadow-soft sm:p-7" />
  }
);
