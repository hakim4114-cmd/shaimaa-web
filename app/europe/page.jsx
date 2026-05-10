import { EuropePreOrderForm } from "@/components/forms/EuropePreOrderForm";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { StickyWhatsAppButton } from "@/components/layout/StickyWhatsAppButton";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { defaultLanguage, getTranslation } from "@/data/translations";

export default function EuropePage() {
  const europePage = getTranslation(defaultLanguage).europePage;

  return (
    <main className="min-h-screen overflow-x-hidden pt-16 sm:pt-20">
      <Header />
      <section className="px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
        <SectionTitle label={europePage.label} title={europePage.title} text={europePage.text} />
        <div className="mx-auto mt-10 max-w-2xl">
          <EuropePreOrderForm />
        </div>
      </section>
      <Footer />
      <StickyWhatsAppButton />
    </main>
  );
}
