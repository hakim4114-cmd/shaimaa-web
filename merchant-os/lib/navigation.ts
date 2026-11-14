import {
  Banknote,
  Boxes,
  ChartColumn,
  Factory,
  Inbox,
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

export const navigation: NavGroup[] = [
  {
    key: "operations",
    items: [
      { key: "commandCenter", icon: LayoutDashboard, href: "/" },
      { key: "orders", icon: Package, phase: 2 },
      { key: "shipping", icon: Truck, phase: 2 },
      { key: "returns", icon: Undo2, phase: 2 },
      { key: "customers", icon: Users, phase: 2 },
      { key: "support", icon: Inbox, phase: 3 }
    ]
  },
  {
    key: "catalog",
    items: [
      { key: "products", icon: Boxes, phase: 2 },
      { key: "inventory", icon: ChartColumn, phase: 2 },
      { key: "production", icon: Factory, phase: 5 }
    ]
  },
  {
    key: "money",
    items: [
      { key: "finance", icon: Wallet, phase: 2 },
      { key: "cod", icon: Banknote, phase: 2 }
    ]
  },
  {
    key: "growth",
    items: [
      { key: "marketing", icon: Megaphone, phase: 3 },
      { key: "assistant", icon: Sparkles, phase: 4 }
    ]
  },
  {
    key: "system",
    items: [
      { key: "settings", icon: Settings, phase: 2 },
      { key: "designSystem", icon: Palette, href: "/design-system", devOnly: true }
    ]
  }
];

export function visibleNavigation(isDevelopment: boolean): NavGroup[] {
  return navigation
    .map((group) => ({ ...group, items: group.items.filter((item) => !item.devOnly || isDevelopment) }))
    .filter((group) => group.items.length > 0);
}
