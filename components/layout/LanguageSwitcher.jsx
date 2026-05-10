"use client";

import { useEffect, useSyncExternalStore } from "react";
import {
  defaultLanguage,
  getLanguageDirection,
  getTranslation,
  languageStorageKey,
  languages,
  normalizeLanguage
} from "@/data/translations";

export const languageChangeEventName = "maison-shaimaa-language-change";

function applyDocumentLanguage(language) {
  const normalizedLanguage = normalizeLanguage(language);
  document.documentElement.lang = normalizedLanguage;
  document.documentElement.dir = getLanguageDirection(normalizedLanguage);
}

function readStoredLanguage() {
  if (typeof window === "undefined") {
    return defaultLanguage;
  }

  return normalizeLanguage(window.localStorage.getItem(languageStorageKey) || defaultLanguage);
}

function subscribeToLanguageChanges(callback) {
  window.addEventListener(languageChangeEventName, callback);
  window.addEventListener("storage", callback);

  return () => {
    window.removeEventListener(languageChangeEventName, callback);
    window.removeEventListener("storage", callback);
  };
}

function getServerLanguageSnapshot() {
  return defaultLanguage;
}

export function useSelectedLanguage() {
  return useSyncExternalStore(subscribeToLanguageChanges, readStoredLanguage, getServerLanguageSnapshot);
}

export function LanguageSwitcher() {
  const selectedLanguage = useSelectedLanguage();
  const languageSwitcher = getTranslation(selectedLanguage).languageSwitcher;

  useEffect(() => {
    applyDocumentLanguage(selectedLanguage);
  }, [selectedLanguage]);

  function handleLanguageChange(language) {
    const normalizedLanguage = normalizeLanguage(language);

    window.localStorage.setItem(languageStorageKey, normalizedLanguage);
    applyDocumentLanguage(normalizedLanguage);
    window.dispatchEvent(new CustomEvent(languageChangeEventName, { detail: { language: normalizedLanguage } }));
  }

  return (
    <div className="inline-flex shrink-0 rounded-full border border-brass/30 bg-pearl p-1" aria-label={languageSwitcher.label}>
      {languages.map((language) => (
        <button
          key={language.code}
          type="button"
          onClick={() => handleLanguageChange(language.code)}
          className={`rounded-full px-2.5 py-1.5 text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-henna sm:px-3 ${
            selectedLanguage === language.code ? "bg-cedar text-ivory" : "text-coffee hover:text-henna"
          }`}
          aria-pressed={selectedLanguage === language.code}
          aria-label={languageSwitcher.switchTo.replace("{language}", language.name)}
        >
          {language.label}
        </button>
      ))}
    </div>
  );
}
