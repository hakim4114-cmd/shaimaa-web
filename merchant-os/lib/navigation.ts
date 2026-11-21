import { Banknote, Boxes, Calculator, CalendarCheck, CalendarRange, ChartColumn, HandCoins, LayoutDashboard, Megaphone, Package, Palette, Settings, TrendingUp, Truck, Undo2, Users, Wallet, type LucideIcon } from "lucide-react";
import type { Dictionary } from "@/lib/i18n/dictionaries";

type NavLabelKey = Exclude<keyof Dictionary["nav"], "groups" | "comingInPhase" | "collapse" | "expand" | "openMenu" | "closeMenu">;

export type NavItem = {
  key: NavLabelKey;
  icon: LucideIcon;
  /** Route, present only once the module is actually built. */
  href?: string;
  /** Roadmap phase that delivers the module (shown while href is absent). */
  phase?: number;
  devOnly?: boolean;
  /** Hidden in the essential view (Preferences → Sections) until the owner needs it. */
  advanced?: boolean;
};

export type NavGroup = { key: keyof Dictionary["nav"]["groups"]; items: NavItem[] };

// `phase` = the roadmap step that delivers the module (IMPLEMENTATION_ROADMAP.md).
// Deferred modules (production, marketing, support inbox) are not listed.
export const navigation: NavGroup[] = [
  {
    key: "operations",
    items: [
      { key: "commandCenter", icon: LayoutDashboard, href: "/" },
      { key: "orders", icon: Package, href: "/orders" },
      { key: "customers", icon: Users, href: "/customers", advanced: true },
      { key: "shipping", icon: Truck, href: "/shipping" },
      { key: "returns", icon: Undo2, href: "/returns" }
    ]
  },
  {
    key: "catalog",
    items: [
      { key: "products", icon: Boxes, href: "/products" },
      { key: "inventory", icon: ChartColumn, href: "/inventory" }
    ]
  },
  {
    key: "money",
    items: [
      { key: "cod", icon: Banknote, href: "/cash" },
      { key: "finance", icon: Wallet, href: "/finance", advanced: true },
      { key: "pay", icon: HandCoins, href: "/pay" },
      { key: "reports", icon: TrendingUp, href: "/reports" },
      { key: "review", icon: CalendarCheck, href: "/review", advanced: true },
      { key: "close", icon: CalendarRange, href: "/close", advanced: true }
    ]
  },
  {
    key: "growth",
    items: [
      { key: "marketing", icon: Megaphone, href: "/marketing", advanced: true },
      { key: "pricing", icon: Calculator, href: "/pricing", advanced: true }
    ]
  },
  {
    key: "system",
    items: [
      { key: "settings", icon: Settings, href: "/settings" },
      { key: "designSystem", icon: Palette, href: "/design-system", devOnly: true }
    ]
  }
];

export function visibleNavigation(isDevelopment: boolean, essentialOnly = false): NavGroup[] {
  return navigation
    .map((group) => ({ ...group, items: group.items.filter((item) => (!item.devOnly || isDevelopment) && !(essentialOnly && item.advanced)) }))
    .filter((group) => group.items.length > 0);
}
