"use client";

import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { useSelectedLanguage } from "@/components/layout/LanguageSwitcher";
import { StickyWhatsAppButton } from "@/components/layout/StickyWhatsAppButton";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { getTranslation } from "@/data/translations";

export default function AboutPage() {
  const aboutPage = getTranslation(useSelectedLanguage()).aboutPage;

  return (
    <main className="min-h-screen overflow-hidden pt-28">
      <Header />
      <section className="moroccan-frame px-4 py-20 sm:px-6 lg:px-8">
        <SectionTitle label={aboutPage.label} title={aboutPage.title} text={aboutPage.text} />
      </section>
      <Footer />
      <StickyWhatsAppButton />
    </main>
  );
}
