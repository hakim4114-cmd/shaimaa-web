import { describe, expect, it } from "vitest";
import { businessDay, isDueByToday } from "@/lib/datetime";
import { callOutcomes, compareCallQueue, outcomeNeedsNote, outcomeNeedsTime } from "@/lib/orders/calls";
import { whatsappLanguages, whatsappLink, whatsappMessage, whatsappTemplates } from "@/lib/orders/whatsapp";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const context = { customerName: " Amina ", storeName: "Dar Amina", orderNumber: "MOS-000012", items: "Djellaba × 1", total: "450,00 MAD", city: "" };

describe("WhatsApp templates", () => {
  it("fills every placeholder in every language", () => {
    for (const language of whatsappLanguages) {
      for (const template of whatsappTemplates) {
        const text = whatsappMessage(language, template, context);
        expect(text).not.toMatch(/\{\w+\}/);
        expect(text).toContain("MOS-000012");
      }
    }
  });

  it("trims the name and shows a dash for an unknown city", () => {
    const text = whatsappMessage("fr", "confirm", context);
    expect(text).toContain("Bonjour Amina,");
    expect(text).toContain("Ville : —");
  });

  it("builds wa.me links only for valid Moroccan numbers", () => {
    expect(whatsappLink("+212612345678")).toBe("https://wa.me/212612345678");
    expect(whatsappLink("+212612345678", "a b&c")).toBe("https://wa.me/212612345678?text=a%20b%26c");
    expect(whatsappLink("0612345678")).toBeNull();
  });
});

describe("call outcomes", () => {
  it("match the database enum", () => {
    const sql = readFileSync(join(__dirname, "../../supabase/migrations/20261116000400_order_workflow.sql"), "utf8");
    const match = /create type public\.call_outcome as enum \(([^)]*)\)/.exec(sql);
    const values = (match?.[1] ?? "").match(/'([a-z_]+)'/g)?.map((v) => v.slice(1, -1)) ?? [];
    expect([...callOutcomes].sort()).toEqual(values.sort());
  });

  it("know which outcomes need a note or a time", () => {
    expect(outcomeNeedsNote("cancelled")).toBe(true);
    expect(outcomeNeedsNote("no_answer")).toBe(false);
    expect(outcomeNeedsTime("call_back_requested")).toBe(true);
  });
});

describe("Moroccan business day", () => {
  it("follows the Africa/Casablanca time zone (offset comes from the tz database)", () => {
    const instant = "2026-11-16T23:30:00Z";
    const expected = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Casablanca", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(instant));
    expect(businessDay(instant)).toBe(expected);
    expect(businessDay("2026-11-16T12:00:00Z")).toBe("2026-11-16");
  });

  it("treats today and overdue call-backs as due", () => {
    const now = new Date("2026-11-17T10:00:00Z");
    expect(isDueByToday("2026-11-17T20:00:00Z", now)).toBe(true);
    expect(isDueByToday("2026-11-15T08:00:00Z", now)).toBe(true);
    expect(isDueByToday("2026-11-18T09:00:00Z", now)).toBe(false);
    expect(isDueByToday(null, now)).toBe(false);
  });
});

describe("call queue", () => {
  it("puts due call-backs first, then never-called (oldest first), then others, then later call-backs", () => {
    const now = Date.parse("2026-11-17T10:00:00Z");
    const rows = [
      { id: "later", nextCallAt: "2026-11-17T18:00:00Z", callAttempts: 1, createdAt: "2026-11-15T09:00:00Z" },
      { id: "tried", nextCallAt: null, callAttempts: 2, createdAt: "2026-11-14T09:00:00Z" },
      { id: "new-recent", nextCallAt: null, callAttempts: 0, createdAt: "2026-11-17T09:00:00Z" },
      { id: "due", nextCallAt: "2026-11-17T09:30:00Z", callAttempts: 1, createdAt: "2026-11-16T09:00:00Z" },
      { id: "new-old", nextCallAt: null, callAttempts: 0, createdAt: "2026-11-16T08:00:00Z" }
    ];
    expect([...rows].sort((a, b) => compareCallQueue(a, b, now)).map((r) => r.id)).toEqual(["due", "new-old", "new-recent", "tried", "later"]);
  });
});
