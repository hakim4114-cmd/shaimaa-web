"use client";

import { MessageCircle } from "lucide-react";
import { useSelectedLanguage } from "./LanguageSwitcher";
import { getLanguageDirection, getTranslation } from "@/data/translations";
import { whatsappHref } from "@/lib/constants";

export function StickyWhatsAppButton() {
  const language = useSelectedLanguage();
  const direction = getLanguageDirection(language);
  const stickyWhatsApp = getTranslation(language).stickyWhatsApp;
  const sidePosition = direction === "rtl" ? "sm:left-5" : "sm:right-5";

  return (
    <a
      href={whatsappHref}
      className={`fixed bottom-5 z-50 hidden h-14 items-center justify-center gap-2 rounded-full bg-[#25D366] px-5 text-white shadow-soft transition hover:scale-105 sm:inline-flex ${sidePosition}`}
      aria-label={stickyWhatsApp.ariaLabel}
    >
      <MessageCircle size={25} />
      <span className="hidden text-sm font-bold sm:inline">{stickyWhatsApp.label}</span>
    </a>
  );
}
