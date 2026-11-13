import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { canTransition, orderStatuses, orderTransitions } from "@/lib/domain/order-status";

const migrationsDir = join(__dirname, "../../supabase/migrations");
const schemaSql = readdirSync(migrationsDir)
  .filter((file) => file.endsWith(".sql"))
  .sort()
  .map((file) => readFileSync(join(migrationsDir, file), "utf8"))
  .join("\n");

function sqlTransitions(): string[] {
  const block = /insert into app\.order_transitions[^;]+;/.exec(schemaSql)?.[0] ?? "";
  return [...block.matchAll(/\('([a-z_]+)', '([a-z_]+)'\)/g)].map((match) => `${match[1]}->${match[2]}`).sort();
}

function sqlStatuses(): string[] {
  const block = /create type public\.order_status as enum \(([^)]+)\)/.exec(schemaSql)?.[1] ?? "";
  return [...block.matchAll(/'([a-z_]+)'/g)].map((match) => match[1] ?? "");
}

describe("order workflow", () => {
  it("matches the database enum", () => {
    expect([...orderStatuses]).toEqual(sqlStatuses());
  });

  it("matches the database transition table", () => {
    const uiTransitions = Object.entries(orderTransitions)
      .flatMap(([from, targets]) => targets.map((to) => `${from}->${to}`))
      .sort();
    expect(uiTransitions.length).toBeGreaterThan(0);
    expect(uiTransitions).toEqual(sqlTransitions());
  });

  it("never allows skipping straight to shipped or delivered", () => {
    expect(canTransition("new", "shipped")).toBe(false);
    expect(canTransition("confirmed", "delivered")).toBe(false);
    expect(canTransition("shipped", "cancelled")).toBe(false);
  });
});
