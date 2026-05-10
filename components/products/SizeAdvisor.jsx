"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, ChevronDown, PhoneCall, Ruler } from "lucide-react";
import { useSelectedLanguage } from "@/components/layout/LanguageSwitcher";
import { IconTextRow } from "@/components/ui/IconTextRow";
import { getLanguageDirection, getTranslation } from "@/data/translations";
import { getSizeAdvice, sizeAdvisorOptions } from "@/lib/sizeAdvisor";

const confidenceStyles = {
  high: "bg-olive/10 text-olive",
  medium: "bg-brass/15 text-cedar",
  "needs confirmation": "bg-henna/10 text-henna"
};

export function SizeAdvisor({ availableSizes }) {
  const language = useSelectedLanguage();
  const direction = getLanguageDirection(language);
  const advisorCopy = getTranslation(language).sizeAdvisor;
  const textAlignment = direction === "rtl" ? "text-right" : "text-left";
  const [isOpen, setIsOpen] = useState(false);
  const [heightCm, setHeightCm] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [quarterChest, setQuarterChest] = useState("");
  const [fitPreference, setFitPreference] = useState("regular");
  const [usualSize, setUsualSize] = useState("unknown");

  const advice = useMemo(
    () =>
      getSizeAdvice({
        heightCm,
        weightKg,
        quarterChest,
        fitPreference,
        usualSize,
        availableSizes,
        copy: advisorCopy
      }),
    [advisorCopy, availableSizes, fitPreference, heightCm, quarterChest, usualSize, weightKg]
  );

  return (
    <section
      dir={direction}
      lang={language}
      className={`border border-brass/25 bg-ivory p-4 shadow-soft sm:p-5 ${textAlignment}`}
      aria-labelledby="size-advisor-title"
    >
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls="size-advisor-panel"
        onClick={() => setIsOpen((currentValue) => !currentValue)}
        className={`flex w-full items-center justify-between gap-4 ${textAlignment}`}
      >
        <span dir={direction} className={`flex min-w-0 flex-1 items-start gap-3 ${textAlignment}`}>
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-henna text-ivory">
            <Ruler size={19} />
          </span>
          <span className={`min-w-0 flex-1 ${textAlignment}`}>
            <span id="size-advisor-title" className="block text-sm font-bold uppercase tracking-[0.14em] text-coffee">
              {advisorCopy.prompt}
            </span>
            <span className="mt-1 block text-sm leading-6 text-coffee">
              {advisorCopy.intro}
            </span>
          </span>
        </span>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-brass/30 text-henna">
          <ChevronDown className={`transition ${isOpen ? "rotate-180" : ""}`} size={18} />
        </span>
      </button>

      {isOpen ? (
        <div id="size-advisor-panel">
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-semibold text-cedar">
              {advisorCopy.height}
              <input
                type="number"
                min="130"
                max="210"
                inputMode="numeric"
                value={heightCm}
                onChange={(event) => setHeightCm(event.target.value)}
                className="min-h-12 border border-brass/30 bg-pearl px-4 text-base font-semibold text-ink outline-none transition focus:border-henna"
                placeholder="165"
                dir="ltr"
              />
            </label>

            <label className="grid gap-2 text-sm font-semibold text-cedar">
              {advisorCopy.weight}
              <input
                type="number"
                min="35"
                max="160"
                inputMode="numeric"
                value={weightKg}
                onChange={(event) => setWeightKg(event.target.value)}
                className="min-h-12 border border-brass/30 bg-pearl px-4 text-base font-semibold text-ink outline-none transition focus:border-henna"
                placeholder="68"
                dir="ltr"
              />
            </label>
          </div>

          <div className="mt-4">
            <p className="mb-2 text-sm font-semibold text-cedar">{advisorCopy.fitPreference}</p>
            <div className="grid grid-cols-3 gap-2">
              {sizeAdvisorOptions.fitPreferences.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setFitPreference(option.value)}
                  className={`min-h-11 border px-2 text-sm font-bold transition ${
                    fitPreference === option.value
                      ? "border-henna bg-henna text-ivory"
                      : "border-brass/30 bg-pearl text-cedar hover:border-henna"
                  }`}
                >
                  {advisorCopy.fitPreferences[option.value] || option.label}
                </button>
              ))}
            </div>
          </div>

          <label className="mt-4 grid gap-2 text-sm font-semibold text-cedar">
            {advisorCopy.quarterChest}
            <input
              type="number"
              min="20"
              max="50"
              inputMode="decimal"
              value={quarterChest}
              onChange={(event) => setQuarterChest(event.target.value)}
              className="min-h-12 border border-brass/30 bg-pearl px-4 text-base font-semibold text-ink outline-none transition focus:border-henna"
              placeholder="30"
              dir="ltr"
            />
            <span className="text-sm font-normal leading-6 text-coffee">
              {advisorCopy.quarterChestHelper}
            </span>
          </label>

          <label className="mt-4 grid gap-2 text-sm font-semibold text-cedar">
            {advisorCopy.usualSize}
            <select
              value={usualSize}
              onChange={(event) => setUsualSize(event.target.value)}
              className="min-h-12 border border-brass/30 bg-pearl px-4 text-base font-semibold text-ink outline-none transition focus:border-henna"
            >
              {sizeAdvisorOptions.usualSizes.map((option) => (
                <option key={option.value} value={option.value}>
                  {advisorCopy.usualSizes[option.value] || option.label}
                </option>
              ))}
            </select>
          </label>

          <div className="mt-5 border-t border-brass/20 pt-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-coffee">
                  {advisorCopy.recommendedSize}
                </p>
                <p className="mt-1 font-display text-4xl font-bold text-henna">{advice.recommendedSize || "-"}</p>
              </div>
              <span
                className={`inline-flex w-fit items-center gap-2 rounded-full px-3 py-2 text-xs font-bold uppercase tracking-[0.1em] ${
                  confidenceStyles[advice.confidence]
                }`}
              >
                <CheckCircle2 size={15} />
                {advisorCopy.confidenceLabels[advice.confidence] || advice.confidence}
              </span>
            </div>

            <p className="mt-3 text-sm leading-6 text-coffee">{advice.note}</p>
            <IconTextRow
              direction={direction}
              icon={<PhoneCall className="text-henna" size={17} />}
              className="mt-4 bg-pearl p-3 text-sm font-semibold leading-6 text-cedar"
            >
              {advice.confirmationMessage}
            </IconTextRow>
          </div>
        </div>
      ) : null}
    </section>
  );
}
