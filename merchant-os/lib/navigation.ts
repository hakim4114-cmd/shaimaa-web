import {
  Banknote,
  Boxes,
  Calculator,
  CalendarCheck,
  CalendarRange,
  ChartColumn,
  LayoutDashboard,
  Megaphone,
  Package,
  Palette,
  Settings,
  Sparkles,
  Truck,
  Undo2,
  Users,
  Wallet,
  type LucideIcon
} from "lucide-react";
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
      { key: "customers", icon: Users, href: "/customers" },
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
      { key: "finance", icon: Wallet, href: "/finance" },
      { key: "review", icon: CalendarCheck, href: "/review" },
      { key: "close", icon: CalendarRange, href: "/close" }
    ]
  },
  {
    key: "growth",
    items: [
      { key: "marketing", icon: Megaphone, href: "/marketing" },
      { key: "pricing", icon: Calculator, href: "/pricing" },
      { key: "assistant", icon: Sparkles, phase: 7 }
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

export function visibleNavigation(isDevelopment: boolean): NavGroup[] {
  return navigation
    .map((group) => ({ ...group, items: group.items.filter((item) => !item.devOnly || isDevelopment) }))
    .filter((group) => group.items.length > 0);
}
