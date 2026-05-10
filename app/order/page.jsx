"use client";

import Link from "next/link";
import { CODOrderForm } from "@/components/forms/CODOrderForm";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { StickyWhatsAppButton } from "@/components/layout/StickyWhatsAppButton";
import { useSelectedLanguage } from "@/components/layout/LanguageSwitcher";
import { getLanguageDirection, getTranslation } from "@/data/translations";
import { PhoneCall, Ruler, ShieldCheck, Truck, WalletCards } from "lucide-react";

const trustIcons = [WalletCards, PhoneCall, Truck];

export default function OrderPage() {
  const language = useSelectedLanguage();
  const direction = getLanguageDirection(language);
  const orderPage = getTranslation(language).orderPage;
  const textAlignment = direction === "rtl" ? "text-right" : "text-left";
  const iconAfterTextDirection = direction === "rtl" ? "flex-row-reverse" : "";
  const maxWidthAlignment = direction === "rtl" ? "me-auto" : "";

  return (
    <main className="min-h-screen overflow-x-hidden pt-16 sm:pt-20">
      <Header />
      <section dir={direction} lang={language} className="px-4 pb-12 pt-6 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
        <div className={`mx-auto max-w-7xl ${textAlignment}`}>
          <p
            className="inline-flex items-center gap-2 rounded-full border border-brass/40 bg-ivory px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-henna"
          >
            <ShieldCheck size={15} />
            {orderPage.badge}
          </p>
          <h1
            className={`mt-5 max-w-3xl font-display text-4xl font-bold leading-tight text-cedar sm:text-6xl ${maxWidthAlignment}`}
          >
            {orderPage.title}
          </h1>
          <p className={`mt-5 max-w-2xl text-lg leading-8 text-coffee ${maxWidthAlignment}`}>{orderPage.text}</p>

          <div className="mt-8 grid gap-3 md:grid-cols-3">
            {orderPage.cards.map(([title, text], index) => {
              const TrustIcon = trustIcons[index];
              return (
                <div key={title} className="bg-ivory p-5 shadow-soft">
                  <TrustIcon className="mb-3 text-henna" size={22} />
                  <h2 className="font-display text-2xl font-semibold text-cedar">{title}</h2>
                  <p className="mt-2 text-sm leading-6 text-coffee">{text}</p>
                </div>
              );
            })}
          </div>

          <Link
            href="/size-guide"
            className={`mt-6 inline-flex items-center gap-2 text-sm font-bold uppercase tracking-[0.12em] text-henna ${iconAfterTextDirection}`}
          >
            {orderPage.sizeGuide}
            <Ruler size={17} />
          </Link>
        </div>

        <div className="mx-auto mt-10 max-w-7xl">
          <CODOrderForm />
        </div>
      </section>
      <Footer />
      <StickyWhatsAppButton />
    </main>
  );
}
