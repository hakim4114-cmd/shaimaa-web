// Brand mark rendered as an image (favicon, Apple touch icon, PWA icons).
// Colours are the Atlas identity's hex values: ImageResponse cannot read CSS variables.
export const brandAccentHex = "#b84e26";
export const brandInkHex = "#123b35";
export const brandBackgroundHex = "#f7f2ea";
const brandDotHex = "#e8a33d";

/**
 * The installed-app icon: the white mark on a zellige-green tile, with a saffron dot.
 * `padding` is the safe margin (maskable icons need a larger one).
 */
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
        background: brandInkHex,
        borderRadius: rounded ? Math.round(size * 0.24) : 0
      }}
    >
      <svg width={inner} height={inner} viewBox="0 0 24 24" fill="none">
        <path d="M4 18V7.5L12 14l8-6.5V18" stroke="#ffffff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="12" cy="5" r="1.7" fill={brandDotHex} />
      </svg>
    </div>
  );
}
