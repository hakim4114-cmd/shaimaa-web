import { Cormorant_Garamond, IBM_Plex_Sans_Arabic, Inter, Noto_Naskh_Arabic } from "next/font/google";
import "./globals.css";

const latinDisplay = Cormorant_Garamond({
  subsets: ["latin"],
  variable: "--font-display-latin",
  weight: ["600", "700"],
  display: "swap"
});

const latinBody = Inter({
  subsets: ["latin"],
  variable: "--font-body-latin",
  weight: ["400", "500", "600", "700"],
  display: "swap"
});

const arabicDisplay = Noto_Naskh_Arabic({
  subsets: ["arabic"],
  variable: "--font-display-arabic",
  weight: ["500", "600", "700"],
  display: "swap"
});

const arabicBody = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"],
  variable: "--font-body-arabic",
  weight: ["400", "500", "600", "700"],
  display: "swap"
});

export const metadata = {
  title: "Maison Shaimaa | Moroccan Traditional Fashion",
  description:
    "Premium Moroccan djellaba and traditional fashion with elegant craftsmanship, limited collections, and cash on delivery in Morocco.",
  alternates: {
    canonical: "/"
  },
  openGraph: {
    title: "Maison Shaimaa | Moroccan Traditional Fashion",
    description:
      "Premium Moroccan djellaba and traditional fashion with cash on delivery in Morocco.",
    type: "website",
    siteName: "Maison Shaimaa"
  }
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="ar"
      dir="rtl"
      className={`${latinDisplay.variable} ${latinBody.variable} ${arabicDisplay.variable} ${arabicBody.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
