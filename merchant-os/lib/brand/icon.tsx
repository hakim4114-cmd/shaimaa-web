// Brand mark rendered as an image (favicon, Apple touch icon, PWA icons).
// Colors are the accent token's sRGB equivalents: ImageResponse cannot read CSS variables.
export const brandAccentHex = "#4b4fc9";
export const brandBackgroundHex = "#f8f9fb";

export function BrandIcon({ size, padding = 0.18, rounded = true }: { size: number; padding?: number; rounded?: boolean }) {
  const inner = Math.round(size * (1 - padding * 2));
  return (
    <div
      style={{
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: brandAccentHex,
        borderRadius: rounded ? Math.round(size * 0.22) : 0
      }}
    >
      <svg width={inner} height={inner} viewBox="0 0 24 24" fill="none">
        <path d="M4 18V6l8 7 8-7v12" stroke="#ffffff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}
