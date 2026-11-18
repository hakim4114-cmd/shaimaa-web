// One-tap WhatsApp messages: opens WhatsApp with a prefilled text through a
// wa.me link. No WhatsApp API, nothing is sent until the merchant taps send.
import { moroccanE164Pattern } from "@/lib/phone";

export const whatsappLanguages = ["darija", "ar", "fr"] as const;
export type WhatsappLanguage = (typeof whatsappLanguages)[number];

export const whatsappTemplates = ["confirm", "noAnswer", "confirmed", "shipped", "deliveryReminder", "cancelled"] as const;
export type WhatsappTemplate = (typeof whatsappTemplates)[number];

export type WhatsappContext = {
  customerName: string;
  storeName: string;
  orderNumber: string;
  items: string;
  total: string;
  city: string;
  /** Carrier tracking number, when the parcel exists. */
  tracking?: string | null;
};

const texts: Record<WhatsappLanguage, Record<WhatsappTemplate, string>> = {
  darija: {
    confirm:
      "السلام عليكم {name}، معاك {store}.\nوصلتنا الطلبية ديالك رقم {order}:\n{items}\nالمجموع: {total} (الخلاص عند التوصل)\nالمدينة: {city}\nواش نأكدو ليك الطلبية؟",
    noAnswer: "السلام عليكم {name}، معاك {store}. عيطنا ليك باش نأكدو الطلبية {order} وما جاوبتيش. إمتى نقدرو نعيطو ليك؟",
    confirmed: "شكرا {name}! الطلبية {order} تأكدات وغادي توصلك قريب إن شاء الله. المجموع: {total} عند التوصل.",
    shipped: "السلام عليكم {name}، الطلبية ديالك {order} خرجات مع شركة التوصيل.\nرقم التتبع: {tracking}\nالموزع غادي يعيط ليك قبل ما يجي. وجد {total} عافاك.",
    deliveryReminder: "السلام عليكم {name}، الطلبية {order} غادي توصلك قريب. خلي التلفون مشعول وجد {total} باش يكون التوصيل ساهل. شكرا!",
    cancelled: "السلام عليكم {name}، تلغات الطلبية {order} كيفما طلبتي. إلا بغيتي شي حاجة أخرى، حنا هنا."
  },
  ar: {
    confirm:
      "السلام عليكم {name}، معك {store}.\nتوصلنا بطلبك رقم {order}:\n{items}\nالمجموع: {total} (الدفع عند الاستلام)\nالمدينة: {city}\nهل تؤكد الطلب؟",
    noAnswer: "السلام عليكم {name}، معك {store}. حاولنا الاتصال بك لتأكيد الطلب {order} دون رد. متى يناسبك أن نتصل؟",
    confirmed: "شكرًا {name}! تم تأكيد طلبك {order} وسيصلك قريبًا. المبلغ: {total} عند الاستلام.",
    shipped: "السلام عليكم {name}، تم تسليم طلبك {order} لشركة التوصيل.\nرقم التتبع: {tracking}\nسيتصل بك عامل التوصيل قبل وصوله. المرجو تجهيز مبلغ {total}.",
    deliveryReminder: "السلام عليكم {name}، طلبك {order} سيصلك قريبًا. المرجو إبقاء الهاتف مفتوحًا وتجهيز مبلغ {total}. شكرًا!",
    cancelled: "السلام عليكم {name}، تم إلغاء الطلب {order} بناءً على طلبك. نحن في الخدمة متى احتجت."
  },
  fr: {
    confirm:
      "Bonjour {name}, ici {store}.\nNous avons bien reçu votre commande {order} :\n{items}\nTotal : {total} (paiement à la livraison)\nVille : {city}\nConfirmez-vous la commande ?",
    noAnswer: "Bonjour {name}, ici {store}. Nous avons essayé de vous appeler pour confirmer la commande {order}. Quand pouvons-nous vous rappeler ?",
    confirmed: "Merci {name} ! Votre commande {order} est confirmée et arrive bientôt. Montant : {total} à la livraison.",
    shipped: "Bonjour {name}, votre commande {order} a été remise au transporteur.\nN° de suivi : {tracking}\nLe livreur vous appellera avant de passer. Merci de préparer {total}.",
    deliveryReminder: "Bonjour {name}, votre commande {order} arrive bientôt. Gardez votre téléphone allumé et préparez {total}. Merci !",
    cancelled: "Bonjour {name}, la commande {order} a été annulée comme demandé. Nous restons à votre disposition."
  }
};

export function whatsappMessage(language: WhatsappLanguage, template: WhatsappTemplate, context: WhatsappContext): string {
  const values: Record<string, string> = {
    name: context.customerName.trim(),
    store: context.storeName.trim(),
    order: context.orderNumber,
    items: context.items,
    total: context.total,
    city: context.city || "—",
    tracking: context.tracking?.trim() || "—"
  };
  return texts[language][template].replace(/\{(\w+)\}/g, (match, key: string) => values[key] ?? match);
}

/** wa.me link for a Moroccan E.164 number, or null when the number is not valid. */
export function whatsappLink(phoneE164: string, message?: string): string | null {
  if (!moroccanE164Pattern.test(phoneE164)) return null;
  const base = `https://wa.me/${phoneE164.slice(1)}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}
