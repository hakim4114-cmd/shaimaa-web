const fallbackSiteUrl = "https://shaimaa-web.vercel.app";

export function getSiteUrl() {
  const configuredUrl = (process.env.NEXT_PUBLIC_SITE_URL || "").trim().replace(/\/+$/, "");

  return configuredUrl || fallbackSiteUrl;
}
