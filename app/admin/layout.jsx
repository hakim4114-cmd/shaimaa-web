import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata = {
  robots: {
    index: false,
    follow: false
  }
};

export default function AdminLayout({ children }) {
  const adminRoutesEnabled =
    process.env.NODE_ENV === "development" || process.env.MAISON_ADMIN_ROUTES_ENABLED === "true";

  if (!adminRoutesEnabled) {
    notFound();
  }

  return children;
}
