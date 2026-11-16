import { ImageResponse } from "next/og";
import { BrandIcon } from "@/lib/brand/icon";

// Icons referenced by the web app manifest.
// "maskable" keeps the mark inside the 80 % safe zone Android crops to.
const variants: Record<string, { size: number; padding: number; rounded: boolean }> = {
  "192": { size: 192, padding: 0.18, rounded: true },
  "512": { size: 512, padding: 0.18, rounded: true },
  "maskable-512": { size: 512, padding: 0.3, rounded: false }
};

export const dynamic = "force-static";

export function generateStaticParams() {
  return Object.keys(variants).map((variant) => ({ variant }));
}

export async function GET(_request: Request, { params }: { params: Promise<{ variant: string }> }) {
  const config = variants[(await params).variant];
  if (!config) {
    return new Response("Not found", { status: 404 });
  }
  return new ImageResponse(<BrandIcon {...config} />, { width: config.size, height: config.size });
}
