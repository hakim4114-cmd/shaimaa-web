"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const adminLinks = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/analytics", label: "Analytics" },
  { href: "/admin/settings", label: "Store Settings" },
  { href: "/admin/branding", label: "Branding" },
  { href: "/admin/media", label: "Media" },
  { href: "/admin/seo", label: "SEO" },
  { href: "/admin/advanced", label: "Advanced" }
];

function isActivePath(pathname, href) {
  if (href === "/admin") {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="border-b border-brass/20 bg-cedar p-5 text-ivory lg:sticky lg:top-0 lg:min-h-screen lg:border-b-0">
      <div>
        <p className="font-display text-3xl font-bold">Maison Shaimaa</p>
        <p className="mt-1 text-xs font-bold uppercase tracking-[0.16em] text-brass">Store admin</p>
      </div>
      <nav className="mt-6 grid grid-cols-2 gap-2 text-sm font-semibold sm:grid-cols-3 lg:grid-cols-1">
        {adminLinks.map((link) => {
          const isActive = isActivePath(pathname, link.href);

          return (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-none px-4 py-3 transition ${
                isActive ? "bg-ivory text-cedar" : "text-pearl hover:bg-ivory/10 hover:text-ivory"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-6 border-t border-brass/30 pt-5 text-xs leading-5 text-pearl/75">
        Production admin routes require <span className="font-semibold text-brass">MAISON_ADMIN_ROUTES_ENABLED</span>.
      </div>
      <a
        href="/admin/logout"
        className="mt-5 inline-flex rounded-full border border-brass/40 px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-brass transition hover:border-ivory hover:text-ivory"
      >
        Logout
      </a>
    </aside>
  );
}
