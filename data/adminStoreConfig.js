import { brandName, supportEmail, whatsappDisplayNumber, whatsappHref } from "@/lib/constants";

export const adminStoreConfig = {
  storeName: brandName,
  whatsappNumber: whatsappDisplayNumber,
  whatsappHref,
  supportPhone: whatsappDisplayNumber,
  supportEmail,
  defaultDeliveryFee: 25,
  currency: "MAD",
  paymentMethod: "الدفع عند الاستلام",
  market: "Morocco",
  codEnabled: true,
  announcementBarText: "الدفع عند الاستلام داخل المغرب — التوصيل خلال 2 إلى 4 أيام",
  announcementBarTranslations: {
    ar: "الدفع عند الاستلام داخل المغرب — التوصيل خلال 2 إلى 4 أيام",
    fr: "Paiement à la livraison au Maroc — livraison sous 2 à 4 jours",
    en: "Cash on delivery in Morocco — delivery within 2 to 4 days"
  },
  socialLinks: {
    instagram: "Not configured",
    tiktok: "Not configured",
    facebook: "Not configured"
  },
  orderTrackingEnabled: true,
  branding: {
    logoUrl: "Text logo",
    faviconUrl: "Default Next.js favicon",
    openGraphImageUrl: "Not configured",
    brandColors: ["#4b2e24", "#8f4b2f", "#c69a4a", "#fbf7ef"],
    typography: "Cormorant Garamond, Inter, Noto Naskh Arabic, IBM Plex Sans Arabic",
    homepageHeroImage: "Placeholder illustration until final photography is uploaded"
  }
};
