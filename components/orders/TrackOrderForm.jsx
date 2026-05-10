"use client";

import { useState } from "react";
import { MessageCircle, PackageCheck, Search, ShieldCheck } from "lucide-react";
import { useSelectedLanguage } from "@/components/layout/LanguageSwitcher";
import { getLanguageDirection, getTranslation } from "@/data/translations";
import { whatsappHref } from "@/lib/constants";
import { normalizeOrderId, validateTrackingRequest } from "@/lib/trackingUtils";

const inputClass =
  "w-full border border-brass/30 bg-pearl px-4 py-3 text-cedar outline-none transition focus:border-henna";

function formatDate(value, language) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(language, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

export function TrackOrderForm() {
  const language = useSelectedLanguage();
  const direction = getLanguageDirection(language);
  const trackOrder = getTranslation(language).trackOrder;
  const textAlignment = direction === "rtl" ? "text-right" : "text-left";
  const iconAfterTextDirection = direction === "rtl" ? "flex-row-reverse" : "";
  const [orderId, setOrderId] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [trackingResult, setTrackingResult] = useState(null);

  async function handleSubmit(event) {
    event.preventDefault();

    if (isLoading) {
      return;
    }

    setErrorMessage("");
    setTrackingResult(null);

    const validationError = validateTrackingRequest({ orderId, phoneNumber });

    if (validationError) {
      setErrorMessage(trackOrder.validation[validationError]);
      return;
    }

    try {
      setIsLoading(true);

      const response = await fetch("/api/track-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          orderId: normalizeOrderId(orderId),
          phoneNumber
        })
      });

      const result = await response.json();

      if (!response.ok || result.found !== true) {
        setErrorMessage(
          result.message === "TRACKING_SERVICE_UNAVAILABLE" ? trackOrder.serviceError : trackOrder.notFound
        );
        return;
      }

      setTrackingResult(result);
    } catch {
      setErrorMessage(trackOrder.serviceError);
    } finally {
      setIsLoading(false);
    }
  }

  const statusLabel = trackingResult?.orderStatus
    ? trackOrder.statuses[trackingResult.orderStatus] || trackingResult.orderStatus
    : "";
  const deliveryLabel = trackingResult?.deliveryStatus
    ? trackOrder.statuses[trackingResult.deliveryStatus] || trackingResult.deliveryStatus
    : "";
  const statusMessage = trackingResult?.orderStatus
    ? trackOrder.statusMessages[trackingResult.orderStatus] || trackOrder.statusMessages.New
    : "";

  return (
    <div dir={direction} lang={language} className={`grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-start ${textAlignment}`}>
      <form onSubmit={handleSubmit} className="grid gap-4 bg-ivory p-5 shadow-soft sm:p-7">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-henna">{trackOrder.formLabel}</p>
          <h1 className="mt-3 font-display text-4xl font-bold leading-tight text-cedar sm:text-5xl">
            {trackOrder.title}
          </h1>
          <p className="mt-4 leading-7 text-coffee">{trackOrder.intro}</p>
        </div>

        <label className="grid gap-2 text-sm font-semibold text-cedar">
          {trackOrder.orderIdLabel}
          <input
            required
            value={orderId}
            onChange={(event) => setOrderId(event.target.value)}
            className={inputClass}
            placeholder={trackOrder.orderIdPlaceholder}
            autoComplete="off"
            dir="ltr"
          />
        </label>

        <label className="grid gap-2 text-sm font-semibold text-cedar">
          {trackOrder.phoneLabel}
          <input
            required
            value={phoneNumber}
            onChange={(event) => setPhoneNumber(event.target.value)}
            className={inputClass}
            placeholder={trackOrder.phonePlaceholder}
            inputMode="tel"
            autoComplete="tel"
            dir="ltr"
          />
        </label>

        <div className="flex gap-3 bg-pearl p-4 text-sm font-semibold leading-6 text-cedar">
          <ShieldCheck className="mt-1 shrink-0 text-henna" size={18} />
          <span>{trackOrder.privacy}</span>
        </div>

        {errorMessage ? (
          <p className="bg-henna/10 px-4 py-3 text-sm font-semibold leading-6 text-henna">{errorMessage}</p>
        ) : null}

        <button
          type="submit"
          disabled={isLoading}
          className={`inline-flex items-center justify-center gap-2 rounded-full bg-henna px-6 py-4 text-sm font-bold uppercase tracking-[0.12em] text-ivory shadow-soft transition hover:bg-cedar disabled:cursor-not-allowed disabled:opacity-70 ${iconAfterTextDirection}`}
        >
          {isLoading ? trackOrder.loading : trackOrder.submit}
          <Search size={17} />
        </button>

        <a
          href={whatsappHref}
          className={`inline-flex items-center justify-center gap-2 text-sm font-bold text-henna underline-offset-4 hover:underline ${iconAfterTextDirection}`}
        >
          {trackOrder.whatsapp}
          <MessageCircle size={17} />
        </a>
      </form>

      <aside className="bg-cedar p-6 text-ivory shadow-soft lg:sticky lg:top-28">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-brass">{trackOrder.resultLabel}</p>

        {trackingResult ? (
          <div className="mt-5 grid gap-4">
            <div className="bg-ivory/10 p-4">
              <p className="text-sm text-pearl/80">{trackOrder.orderStatus}</p>
              <p className="mt-1 font-display text-4xl font-bold text-brass">{statusLabel}</p>
            </div>

            {deliveryLabel ? (
              <div className="border-t border-brass/25 pt-4">
                <p className="text-sm text-pearl/80">{trackOrder.deliveryStatus}</p>
                <p className="mt-1 text-lg font-bold text-ivory">{deliveryLabel}</p>
              </div>
            ) : null}

            {trackingResult.lastUpdated ? (
              <div className="border-t border-brass/25 pt-4">
                <p className="text-sm text-pearl/80">{trackOrder.lastUpdated}</p>
                <p className="mt-1 text-sm font-semibold text-ivory">{formatDate(trackingResult.lastUpdated, language)}</p>
              </div>
            ) : null}

            <div className="flex gap-3 border-t border-brass/25 pt-4 text-sm leading-6 text-pearl/85">
              <PackageCheck className="mt-1 shrink-0 text-brass" size={18} />
              <span>{statusMessage}</span>
            </div>
          </div>
        ) : (
          <p className="mt-5 leading-7 text-pearl/80">{trackOrder.emptyResult}</p>
        )}
      </aside>
    </div>
  );
}
