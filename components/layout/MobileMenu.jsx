"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, MessageCircle, X } from "lucide-react";
import { useSelectedLanguage } from "./LanguageSwitcher";
import { getTranslation } from "@/data/translations";
import { whatsappHref } from "@/lib/constants";

const menuLinks = [
  ["collection", "/products"],
  ["startOrder", "/order"],
  ["trackOrder", "/track-order"],
  ["sizeGuide", "/size-guide"],
  ["about", "/about"],
  ["europe", "/europe"]
];

export function MobileMenu() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const nav = getTranslation(useSelectedLanguage()).nav;

  const closeMenu = () => setIsMenuOpen(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsMenuOpen((current) => !current)}
        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-brass/40 text-cedar md:hidden"
        aria-expanded={isMenuOpen}
        aria-label={isMenuOpen ? nav.closeMenu : nav.openMenu}
      >
        {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {isMenuOpen ? (
        <div className="absolute left-0 right-0 top-full border-t border-brass/20 bg-ivory px-4 pb-4 pt-2 shadow-soft md:hidden">
          <div className="mx-auto grid max-w-7xl gap-2">
            {menuLinks.map(([labelKey, href]) => (
              <Link
                key={href}
                href={href}
                onClick={closeMenu}
                className="border-b border-brass/15 py-3 text-sm font-bold uppercase tracking-[0.12em] text-coffee last:border-b-0"
              >
                {nav[labelKey]}
              </Link>
            ))}

            <a
              href={whatsappHref}
              onClick={closeMenu}
              className="mt-2 inline-flex items-center justify-center gap-2 rounded-full bg-henna px-5 py-3 text-sm font-bold uppercase tracking-[0.12em] text-ivory"
            >
              {nav.whatsapp}
              <MessageCircle size={17} />
            </a>
          </div>
        </div>
      ) : null}
    </>
  );
}
