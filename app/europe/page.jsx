"use client";

import { EuropePreOrderForm } from "@/components/forms/EuropePreOrderForm";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { useSelectedLanguage } from "@/components/layout/LanguageSwitcher";
import { StickyWhatsAppButton } from "@/components/layout/StickyWhatsAppButton";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { getTranslation } from "@/data/translations";

export default function EuropePage() {
  const europePage = getTranslation(useSelectedLanguage()).europePage;

  return (
    <main className="min-h-screen overflow-hidden pt-28">
      <Header />
      <section className="px-4 py-16 sm:px-6 lg:px-8">
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
