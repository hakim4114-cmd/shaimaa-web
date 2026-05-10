import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { StickyWhatsAppButton } from "@/components/layout/StickyWhatsAppButton";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { defaultLanguage, getTranslation } from "@/data/translations";

export default function AboutPage() {
  const aboutPage = getTranslation(defaultLanguage).aboutPage;

  return (
    <main className="min-h-screen overflow-x-hidden pt-16 sm:pt-20">
      <Header />
      <section className="moroccan-frame px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
        <SectionTitle label={aboutPage.label} title={aboutPage.title} text={aboutPage.text} />
      </section>
      <Footer />
      <StickyWhatsAppButton />
    </main>
  );
}
