import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans_Arabic, Inter } from "next/font/google";
import type { ReactNode } from "react";
import { Providers } from "@/components/shell/providers";
import { localeDirection } from "@/lib/i18n/config";
import { getI18n } from "@/lib/i18n/server";
import "./globals.css";

const latin = Inter({ subsets: ["latin"], variable: "--font-latin", display: "swap" });
const arabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-arabic",
  display: "swap"
});

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return {
    title: { default: t.app.name, template: `%s · ${t.app.name}` },
    description: t.app.tagline,
    applicationName: t.app.name,
    robots: { index: false, follow: false },
    appleWebApp: { capable: true, title: t.app.name, statusBarStyle: "default" },
    formatDetection: { telephone: false }
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Content may extend under notches/home indicators; padding below keeps it clear.
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8f9fb" },
    { media: "(prefers-color-scheme: dark)", color: "#16181d" }
  ]
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const { locale, t } = await getI18n();
  return (
    <html lang={locale} dir={localeDirection[locale]} className={`${latin.variable} ${arabic.variable}`} suppressHydrationWarning>
      <body>
        <Providers locale={locale} t={t}>
          {children}
        </Providers>
      </body>
    </html>
  );
}
