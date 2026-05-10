"use client";

import dynamic from "next/dynamic";

export const LazySizeAdvisor = dynamic(
  () => import("@/components/products/SizeAdvisor").then((module) => module.SizeAdvisor),
  {
    ssr: false,
    loading: () => <div className="h-28 border border-brass/25 bg-ivory shadow-soft" />
  }
);
