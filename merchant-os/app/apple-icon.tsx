import { ImageResponse } from "next/og";
import { BrandIcon } from "@/lib/brand/icon";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// iOS applies its own rounded mask, so the square is not rounded here.
export default function AppleIcon() {
  return new ImageResponse(<BrandIcon size={180} padding={0.2} rounded={false} />, size);
}
