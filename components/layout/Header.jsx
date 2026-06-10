import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { BrandLogo } from "./BrandLogo";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { MobileMenu } from "./MobileMenu";
import { defaultLanguage, getTranslation } from "@/data/translations";
import { whatsappHref } from "@/lib/constants";

export function Header() {
  const translation = getTranslation(defaultLanguage);
  const nav = translation.nav;

  return (
    <header className="fixed left-0 right-0 top-0 z-40 border-b border-brass/20 bg-ivory/88 backdrop-blur-xl">
      <nav className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4 lg:px-8">
        <Link
          href="/"
          className="flex min-w-0 items-center gap-2.5 font-display text-xl font-bold text-cedar sm:text-2xl"
        >
          <BrandLogo size={34} className="shrink-0" />
          <span className="truncate">Maison Shaimaa</span>
        </Link>

        <div className="hidden items-center gap-8 text-sm font-medium text-coffee md:flex">
          <Link href="/products" className="transition hover:text-henna">
            {nav.collection}
          </Link>
          <Link href="/about" className="transition hover:text-henna">
            {nav.story}
          </Link>
          <Link href="/size-guide" className="transition hover:text-henna">
            {nav.sizeGuide}
          </Link>
          <Link href="/track-order" className="transition hover:text-henna">
            {nav.trackOrder}
          </Link>
        </div>

        <a
          href={whatsappHref}
          className="ms-auto inline-flex shrink-0 items-center gap-2 rounded-full bg-cedar px-3 py-2 text-sm font-semibold text-ivory shadow-soft transition hover:bg-henna sm:px-4"
          aria-label={nav.orderWhatsappAria}
        >
          <MessageCircle size={17} />
          <span className="hidden sm:inline">{nav.order}</span>
        </a>

        <LanguageSwitcher />
        <MobileMenu />
      </nav>
    </header>
  );
}
