import { CheckCircle2, MessageCircle, PhoneCall, ShoppingBag, Truck, WalletCards } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { StickyWhatsAppButton } from "@/components/layout/StickyWhatsAppButton";
import { Button } from "@/components/ui/Button";
import { defaultLanguage, getLanguageDirection, getTranslation } from "@/data/translations";
import { whatsappHref } from "@/lib/constants";

const trustIcons = [WalletCards, PhoneCall, Truck];

export default function ThankYouPage() {
  const language = defaultLanguage;
  const direction = getLanguageDirection(language);
  const thankYou = getTranslation(language).thankYou;
  const textAlignment = direction === "rtl" ? "text-right" : "text-left";
  const iconAfterTextDirection = direction === "rtl" ? "flex-row-reverse" : "";

  return (
    <main className="min-h-screen overflow-x-hidden pt-16 sm:pt-20">
      <Header />

      <section dir={direction} lang={language} className="px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
        <div className="mx-auto max-w-5xl bg-ivory shadow-soft">
          <div className="moroccan-frame px-5 py-12 text-center sm:px-10 lg:px-16">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-cedar text-brass">
              <CheckCircle2 size={34} />
            </div>

            <p className="mt-6 text-sm font-bold uppercase tracking-[0.18em] text-henna">{thankYou.eyebrow}</p>
            <h1 className="mx-auto mt-3 max-w-3xl font-display text-5xl font-bold leading-tight text-cedar sm:text-6xl">
              {thankYou.title}
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-coffee">
              {thankYou.message}
            </p>

            <div className={`mt-8 grid gap-3 md:grid-cols-3 ${textAlignment}`}>
              {thankYou.cards.map(([title, text], index) => {
                const TrustIcon = trustIcons[index];
                return (
                  <div key={title} className="bg-ivory/90 p-5 shadow-soft">
                    <TrustIcon className="mb-4 text-henna" size={24} />
                    <h2 className="font-display text-2xl font-semibold text-cedar">{title}</h2>
                    <p className="mt-2 text-sm leading-6 text-coffee">{text}</p>
                  </div>
                );
              })}
            </div>

            <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
              <a
                href={whatsappHref}
                className={`inline-flex items-center justify-center gap-2 rounded-full bg-henna px-6 py-4 text-sm font-bold uppercase tracking-[0.12em] text-ivory shadow-soft transition hover:bg-cedar ${iconAfterTextDirection}`}
              >
                {thankYou.whatsapp}
                <MessageCircle size={18} />
              </a>
              <Button href="/products" variant="secondary">
                <span className={`inline-flex items-center gap-2 ${iconAfterTextDirection}`}>
                  {thankYou.return}
                  <ShoppingBag size={18} />
                </span>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <Footer />
      <StickyWhatsAppButton />
    </main>
  );
}
