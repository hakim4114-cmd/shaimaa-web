"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle, PhoneCall, Truck, WalletCards } from "lucide-react";
import { useSelectedLanguage } from "@/components/layout/LanguageSwitcher";
import { IconTextRow } from "@/components/ui/IconTextRow";
import { products } from "@/data/products";
import { getLanguageDirection, getTranslation } from "@/data/translations";
import { whatsappHref } from "@/lib/constants";
import { submitOrderToGoogleSheets } from "@/lib/googleSheets";
import { buildCODOrderPayload } from "@/lib/orderUtils";
import { validateCODOrder } from "@/lib/orderValidation";

const inputClass =
  "w-full border border-brass/30 bg-pearl px-4 py-3 text-cedar outline-none transition focus:border-henna";
const googleScriptUrl = process.env.NEXT_PUBLIC_GOOGLE_SCRIPT_URL;

function getProductBySlug(slug) {
  return products.find((product) => product.slug === slug) || products[0];
}

function FieldLabel({ label, children }) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-cedar">
      {label}
      {children}
    </label>
  );
}

function FieldError({ message }) {
  if (!message) {
    return null;
  }

  return <p className="text-xs font-semibold leading-5 text-henna">{message}</p>;
}

function getTranslatedProduct(product, productDetail) {
  return productDetail.products?.[product.slug] || product;
}

function createValidationErrorMap(errors, validationMessages) {
  return errors.reduce((messages, error) => {
    return {
      ...messages,
      [error.field]: validationMessages[error.code] || validationMessages[error.field] || validationMessages.general
    };
  }, {});
}

function appendSuspiciousOrderNote(orderData, suspicious) {
  if (!suspicious?.score) {
    return orderData;
  }

  const internalNote = `[INTERNAL COD RISK NOTE - not customer text: ${suspicious.reasons.join(", ")}]`;
  const notes = orderData.notes ? `${orderData.notes}\n\n${internalNote}` : internalNote;

  return {
    ...orderData,
    notes
  };
}

async function submitOrderToSecondaryReceiver(orderData) {
  try {
    await fetch("/api/orders/wassilni", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ order: orderData })
    });
  } catch {
    // The secondary receiver must never block the confirmed Google Sheets order.
  }
}

function getPrimaryOrderId(result) {
  return result?.orderId || result?.order_id || "";
}

function createSecondaryOrderData(orderData, primaryOrderId) {
  if (!primaryOrderId) {
    return orderData;
  }

  return {
    ...orderData,
    orderId: String(primaryOrderId)
  };
}

export function CODOrderForm({
  initialProductSlug = products[0].slug,
  lockProduct = false,
  intro
} = {}) {
  const router = useRouter();
  const language = useSelectedLanguage();
  const direction = getLanguageDirection(language);
  const translation = getTranslation(language);
  const formCopy = translation.orderForm;
  const productDetail = translation.productDetail;
  const textAlignment = direction === "rtl" ? "text-right" : "text-left";
  const iconAfterTextDirection = direction === "rtl" ? "flex-row-reverse" : "";
  const initialProduct = getProductBySlug(initialProductSlug);
  const [selectedSlug, setSelectedSlug] = useState(initialProduct.slug);
  const [selectedColor, setSelectedColor] = useState(initialProduct.colors[0]);
  const [selectedSize, setSelectedSize] = useState(initialProduct.sizes[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [validationErrors, setValidationErrors] = useState({});

  const selectedProduct = useMemo(() => {
    return getProductBySlug(selectedSlug);
  }, [selectedSlug]);
  const selectedProductCopy = getTranslatedProduct(selectedProduct, productDetail);
  const selectedColorLabel = selectedProductCopy.colors?.[selectedColor] || selectedColor;
  const formIntro = intro || formCopy.intro;

  function handleProductChange(event) {
    const nextProduct = getProductBySlug(event.target.value);

    setSelectedSlug(nextProduct.slug);
    setSelectedColor(nextProduct.colors[0]);
    setSelectedSize(nextProduct.sizes[0]);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setErrorMessage("");
    setValidationErrors({});

    if (isSubmitting) {
      return;
    }

    if (!googleScriptUrl) {
      setErrorMessage(formCopy.error);
      return;
    }

    const formData = new FormData(event.currentTarget);
    const orderData = {
      ...buildCODOrderPayload({ formData, selectedProduct, selectedColor, selectedSize }),
      paymentMethod: "Cash on Delivery",
      orderStatus: "New",
      source: "website"
    };
    const validation = validateCODOrder(orderData, selectedProduct);

    if (!validation.isValid) {
      setValidationErrors(createValidationErrorMap(validation.errors, formCopy.validation));
      return;
    }

    try {
      setIsSubmitting(true);
      const finalOrderData = appendSuspiciousOrderNote(orderData, validation.suspicious);

      const result = await submitOrderToGoogleSheets({
        scriptUrl: googleScriptUrl,
        orderData: finalOrderData
      });
      const primaryOrderId = getPrimaryOrderId(result);

      if (primaryOrderId) {
        sessionStorage.setItem("maison-shaimaa-order-id", primaryOrderId);
      }

      await submitOrderToSecondaryReceiver(createSecondaryOrderData(finalOrderData, primaryOrderId));

      router.push("/thank-you");
    } catch {
      setErrorMessage(formCopy.error);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      dir={direction}
      lang={language}
      className={`grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)] lg:items-start ${textAlignment}`}
    >
      <form noValidate onSubmit={handleSubmit} className="grid min-w-0 gap-4 bg-ivory p-5 shadow-soft sm:p-7">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-henna">{formCopy.title}</p>
          <p className="mt-2 text-sm leading-6 text-coffee">{formIntro}</p>
        </div>

        {lockProduct ? (
          <div className="border border-brass/25 bg-pearl p-4">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-coffee">{formCopy.selectedProduct}</p>
            <p className="mt-1 font-display text-2xl font-semibold text-cedar">{selectedProductCopy.name}</p>
            <input type="hidden" name="product" value={selectedProduct.slug} />
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <FieldLabel label={formCopy.fullName}>
            <input required name="fullName" className={inputClass} placeholder={formCopy.fullNamePlaceholder} />
            <FieldError message={validationErrors.fullName} />
          </FieldLabel>
          <FieldLabel label={formCopy.phoneNumber}>
            <input
              required
              name="phoneNumber"
              className={inputClass}
              inputMode="tel"
              placeholder={formCopy.phonePlaceholder}
              dir="ltr"
            />
            <FieldError message={validationErrors.phoneNumber} />
          </FieldLabel>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FieldLabel label={formCopy.city}>
            <input required name="city" className={inputClass} placeholder={formCopy.cityPlaceholder} />
            <FieldError message={validationErrors.city} />
          </FieldLabel>
          <FieldLabel label={formCopy.quantity}>
            <input required name="quantity" className={inputClass} min="1" defaultValue="1" type="number" dir="ltr" />
            <FieldError message={validationErrors.quantity} />
          </FieldLabel>
        </div>

        <FieldLabel label={formCopy.fullAddress}>
          <input required name="fullAddress" className={inputClass} placeholder={formCopy.addressPlaceholder} />
          <FieldError message={validationErrors.fullAddress} />
        </FieldLabel>

        <div className={`grid gap-4 ${lockProduct ? "sm:grid-cols-2" : "sm:grid-cols-3"}`}>
          {!lockProduct ? (
            <FieldLabel label={formCopy.product}>
              <select name="product" className={inputClass} value={selectedSlug} onChange={handleProductChange}>
                {products.map((product) => (
                  <option key={product.slug} value={product.slug}>
                    {getTranslatedProduct(product, productDetail).name}
                  </option>
                ))}
              </select>
              <FieldError message={validationErrors.product} />
            </FieldLabel>
          ) : null}

          <FieldLabel label={formCopy.color}>
            <select
              name="color"
              className={inputClass}
              value={selectedColor}
              onChange={(event) => setSelectedColor(event.target.value)}
            >
              {selectedProduct.colors.map((color) => (
                <option key={color} value={color}>
                  {selectedProductCopy.colors?.[color] || color}
                </option>
              ))}
            </select>
            <FieldError message={validationErrors.color} />
          </FieldLabel>

          <FieldLabel label={formCopy.size}>
            <select
              name="size"
              className={inputClass}
              value={selectedSize}
              onChange={(event) => setSelectedSize(event.target.value)}
            >
              {selectedProduct.sizes.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
            <FieldError message={validationErrors.size} />
          </FieldLabel>
        </div>

        <FieldLabel label={formCopy.notes}>
          <textarea
            name="notes"
            className={`${inputClass} min-h-28`}
            placeholder={formCopy.notesPlaceholder}
          />
        </FieldLabel>

        <div className="grid gap-3 bg-pearl p-4">
          <IconTextRow
            direction={direction}
            icon={<WalletCards className="text-henna" size={19} />}
            className="text-sm font-semibold text-cedar"
          >
            {formCopy.trustItems[0]}
          </IconTextRow>
          <IconTextRow
            direction={direction}
            icon={<PhoneCall className="text-henna" size={19} />}
            className="text-sm font-semibold text-cedar"
          >
            {formCopy.trustItems[1]}
          </IconTextRow>
          <IconTextRow
            direction={direction}
            icon={<Truck className="text-henna" size={19} />}
            className="text-sm font-semibold text-cedar"
          >
            {formCopy.trustItems[2]}
          </IconTextRow>
        </div>

        {errorMessage ? (
          <p className="bg-henna/10 px-4 py-3 text-sm font-semibold leading-6 text-henna">{errorMessage}</p>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-full bg-henna px-6 py-4 text-sm font-bold uppercase tracking-[0.12em] text-ivory shadow-soft transition hover:bg-cedar disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting ? formCopy.loading : formCopy.submit}
        </button>

        <a
          href={whatsappHref}
          className={`inline-flex items-center justify-center gap-2 text-sm font-bold text-henna underline-offset-4 hover:underline ${iconAfterTextDirection}`}
        >
          {formCopy.help}
          <MessageCircle size={17} />
        </a>
      </form>

      <aside className="min-w-0 bg-cedar p-6 text-ivory shadow-soft lg:sticky lg:top-28">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-brass">{formCopy.summaryTitle}</p>
        <h2 className="mt-3 font-display text-4xl font-bold">{selectedProductCopy.name}</h2>

        <div className="mt-6 divide-y divide-brass/25 border-y border-brass/25">
          <div className="flex flex-wrap items-center justify-between gap-4 py-4">
            <span className="text-pearl/80">{formCopy.productPrice}</span>
            <strong dir="ltr" className="text-brass">{selectedProduct.price}</strong>
          </div>
          <div className="py-4">
            <span className="text-pearl/80">{formCopy.selectedColor}</span>
            <p className="mt-1 text-sm leading-6 text-ivory">{selectedColorLabel}</p>
          </div>
          <div className="py-4">
            <span className="text-pearl/80">{formCopy.selectedSize}</span>
            <p className="mt-1 text-sm leading-6 text-ivory">{selectedSize}</p>
          </div>
          <div className="py-4">
            <span className="text-pearl/80">{formCopy.codPayment}</span>
            <p className="mt-1 text-sm leading-6 text-ivory">{formCopy.codPaymentText}</p>
          </div>
        </div>

        <p className="mt-4 border border-brass/25 bg-pearl/10 px-4 py-3 text-sm font-semibold leading-6 text-pearl">
          {formCopy.summarySelectionNote}
        </p>
        <p className="mt-5 text-sm leading-6 text-pearl/80">{formCopy.summaryNote}</p>
      </aside>
    </div>
  );
}
