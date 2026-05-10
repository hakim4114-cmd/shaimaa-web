"use client";

import { useSelectedLanguage } from "@/components/layout/LanguageSwitcher";
import { getLanguageDirection, getTranslation } from "@/data/translations";

export function StorySection() {
  const language = useSelectedLanguage();
  const direction = getLanguageDirection(language);
  const story = getTranslation(language).story;
  const textAlignment = direction === "rtl" ? "text-right" : "text-left";

  return (
    <section id="story" dir={direction} className="moroccan-frame px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
        <div className={`bg-cedar p-8 text-ivory shadow-soft sm:p-10 ${textAlignment}`}>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-brass">{story.label}</p>
          <h2 className="mt-4 font-display text-4xl font-bold leading-tight sm:text-5xl">
            {story.title}
          </h2>
        </div>

        <div className={`space-y-5 text-lg leading-8 text-coffee ${textAlignment}`}>
          {story.paragraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      </div>
    </section>
  );
}
