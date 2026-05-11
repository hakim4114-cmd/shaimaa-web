import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { StickyWhatsAppButton } from "@/components/layout/StickyWhatsAppButton";
import { Hero } from "@/components/home/Hero";
import { BrandValue } from "@/components/home/BrandValue";
import { CollectionPreview } from "@/components/home/CollectionPreview";
import { SupabaseProducts } from "@/components/home/SupabaseProducts";
import { StorySection } from "@/components/home/StorySection";
import { CODTrust } from "@/components/home/CODTrust";
import { FAQ } from "@/components/home/FAQ";
import { SizeGuide } from "@/components/products/SizeGuide";

export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <main className="min-h-screen overflow-x-hidden">
      <Header />
      <Hero />
      <BrandValue />
      <CollectionPreview />
      <SupabaseProducts />
      <StorySection />
      <CODTrust />
      <SizeGuide />
      <FAQ />
      <Footer />
      <StickyWhatsAppButton />
    </main>
  );
}
