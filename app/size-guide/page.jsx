import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { StickyWhatsAppButton } from "@/components/layout/StickyWhatsAppButton";
import { SizeGuide } from "@/components/products/SizeGuide";

export const metadata = {
  title: "Size Guide | Maison Shaimaa",
  description:
    "Use the Maison Shaimaa size guide and Size Advisor for Moroccan djellaba and traditional fashion sizing.",
  alternates: {
    canonical: "/size-guide"
  }
};

export default function SizeGuidePage() {
  return (
    <main className="min-h-screen overflow-hidden pt-16">
      <Header />
      <SizeGuide />
      <Footer />
      <StickyWhatsAppButton />
    </main>
  );
}
