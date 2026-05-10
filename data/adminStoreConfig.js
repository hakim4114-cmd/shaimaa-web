import { brandName, whatsappHref } from "@/lib/constants";

export const adminStoreConfig = {
  storeName: brandName,
  whatsappNumber: "+212600000000",
  whatsappHref,
  supportPhone: "Not configured",
  supportEmail: "Not configured",
  defaultDeliveryFee: "Manual confirmation",
  currency: "MAD",
  codEnabled: true,
  announcementBarText: "Not configured",
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
