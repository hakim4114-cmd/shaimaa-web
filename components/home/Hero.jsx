import Image from "next/image";
import { ArrowRight, Sparkles } from "lucide-react";
import { defaultLanguage, getLanguageDirection, getTranslation } from "@/data/translations";
import { whatsappHref } from "@/lib/constants";

const heroImage = "/images/hero-djellaba.png";
const heroImageReady = false;

export function Hero() {
  const language = defaultLanguage;
  const direction = getLanguageDirection(language);
  const hero = getTranslation(language).hero;
  const textAlignment = direction === "rtl" ? "text-right" : "text-left";
  const ctaDirection = direction === "rtl" ? "sm:flex-row-reverse" : "sm:flex-row";
  const iconAfterTextDirection = direction === "rtl" ? "flex-row-reverse" : "";

  return (
    <section dir={direction} lang={language} className="relative px-4 pb-12 pt-24 sm:px-6 lg:px-8 lg:pb-16 lg:pt-28">
      <div className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[1.02fr_0.98fr]">
        <div className={`animate-fade-up ${textAlignment}`}>
          <p
            className="mb-4 inline-flex items-center gap-2 rounded-full border border-brass/40 bg-ivory px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-henna"
          >
            <Sparkles size={15} />
            {hero.badge}
          </p>

          <h1 className="max-w-3xl font-display text-5xl font-bold leading-[0.95] text-cedar sm:text-6xl lg:text-7xl">
            {hero.title}
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-coffee">{hero.description}</p>

          <div className={`mt-8 flex flex-col gap-3 ${ctaDirection}`}>
            <a
              href={whatsappHref}
              className={`inline-flex items-center justify-center gap-2 rounded-full bg-henna px-6 py-4 text-sm font-bold uppercase tracking-[0.12em] text-ivory shadow-soft transition hover:bg-cedar ${iconAfterTextDirection}`}
            >
              {hero.primaryCta}
              <ArrowRight size={18} />
            </a>
            <a
              href="#collection"
              className="inline-flex items-center justify-center rounded-full border border-cedar/25 px-6 py-4 text-sm font-bold uppercase tracking-[0.12em] text-cedar transition hover:border-henna hover:text-henna"
            >
              {hero.secondaryCta}
            </a>
          </div>

          <div className="mt-9 grid max-w-xl grid-cols-3 gap-3 text-center">
            {hero.trustItems.map((item) => (
              <div
                key={item}
                className="border-y border-brass/25 py-3 text-xs font-bold uppercase tracking-[0.13em] text-coffee"
              >
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="luxury-border relative mx-auto aspect-[4/5] w-full max-w-[34rem] overflow-hidden bg-cedar shadow-soft sm:aspect-[5/4] lg:aspect-[4/5] lg:max-w-full">
          {heroImageReady ? (
            <Image
              src={heroImage}
              alt={hero.imageAlt}
              fill
              priority
              sizes="(min-width: 1024px) 48vw, 100vw"
              className="object-cover"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-cedar via-henna to-sand">
              <div className="absolute inset-x-12 bottom-0 top-16 rounded-t-[9rem] bg-ivory/75 shadow-2xl" />
              <div className="absolute left-1/2 top-28 h-72 w-44 -translate-x-1/2 rounded-t-[7rem] border border-brass/70 bg-pearl/80" />
              <div className="absolute left-1/2 top-40 h-28 w-28 -translate-x-1/2 rounded-full bg-cedar/90" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-cedar/5 via-transparent to-ink/40" />
          <div className={`absolute bottom-10 left-6 right-6 bg-ivory/95 p-5 backdrop-blur ${textAlignment}`}>
            <p className="font-display text-3xl font-semibold text-cedar">{hero.editTitle}</p>
            <p className="mt-2 text-sm leading-6 text-coffee">{hero.editDescription}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
