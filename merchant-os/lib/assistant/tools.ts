// Read-only tools exposed to Claude through MCP. Each maps to one branch of
// public.assistant_call (the database decides what is returned).
export const assistantTools = [
  {
    name: "today",
    description: "What needs doing now: confirmation calls due, orders to prepare, parcels waiting for pickup, delivery problems, returns to receive, and COD still held by carriers (cents of MAD).",
    inputSchema: { type: "object", properties: {}, additionalProperties: false }
  },
  {
    name: "business_summary",
    description:
      "Financial and operational summary for a date range (Moroccan days, inclusive): orders created/confirmed/shipped/delivered/refused, delivered revenue, refunds, cost of goods, shipping cost, operating expenses, advertising, net profit, cash collected, COD receivable, confirmation rate, return rate, ad cost per delivered order. Amounts are in cents of MAD (divide by 100). Default range: last 30 days.",
    inputSchema: {
      type: "object",
      properties: { from: { type: "string", description: "YYYY-MM-DD" }, to: { type: "string", description: "YYYY-MM-DD" } },
      additionalProperties: false
    }
  },
  {
    name: "orders",
    description:
      "Recent orders without customer contact details: number, status, payment status, city, source, amounts (cents), call attempts, items, campaign. Optional filters: status (new, confirmation_pending, confirmed, preparing, ready_to_ship, shipped, delivered, cancelled, refused, returned, exchange_requested), from/to dates, limit (max 100).",
    inputSchema: {
      type: "object",
      properties: {
        status: { type: "string" },
        from: { type: "string", description: "YYYY-MM-DD" },
        to: { type: "string", description: "YYYY-MM-DD" },
        limit: { type: "integer", minimum: 1, maximum: 100 }
      },
      additionalProperties: false
    }
  },
  {
    name: "order",
    description: "One order by its number (e.g. MOS-000012): items, amounts, confirmation calls, shipment and carrier status, history. No customer phone or address.",
    inputSchema: { type: "object", properties: { order_number: { type: "string" } }, required: ["order_number"], additionalProperties: false }
  },
  {
    name: "stock",
    description: "Stock per variant in hand: on hand, available, minimum level, value at cost (cents) and days since the last sale (dormant stock).",
    inputSchema: { type: "object", properties: {}, additionalProperties: false }
  },
  {
    name: "campaigns",
    description: "Marketing campaigns for a date range: ad spend, orders, confirmed, delivered, refused and delivered revenue (cents). Cost per delivered order = spend / delivered.",
    inputSchema: {
      type: "object",
      properties: { from: { type: "string", description: "YYYY-MM-DD" }, to: { type: "string", description: "YYYY-MM-DD" } },
      additionalProperties: false
    }
  },
  {
    name: "obligations",
    description: "What the business owes and has not paid yet (suppliers, rent, internet, debts…): to whom, amount (cents of MAD), due date, overdue flag, and whether it repeats (weekly, monthly, yearly).",
    inputSchema: { type: "object", properties: {}, additionalProperties: false }
  },
  {
    name: "cash",
    description: "COD still held by carriers by age since delivery (0–7, 8–14, 15+ days) and the last carrier payouts (cents of MAD).",
    inputSchema: { type: "object", properties: {}, additionalProperties: false }
  }
] as const;

export const assistantToolNames = new Set<string>(assistantTools.map((t) => t.name));

/** Keeps only the documented arguments, with simple type checks. */
export function cleanArgs(args: unknown): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  if (!args || typeof args !== "object") return out;
  const a = args as Record<string, unknown>;
  for (const key of ["from", "to"]) {
    const v = a[key];
    if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v)) out[key] = v;
  }
  if (typeof a.status === "string" && /^[a-z_]{3,30}$/.test(a.status)) out.status = a.status;
  if (typeof a.order_number === "string" && /^[A-Za-z0-9-]{3,30}$/.test(a.order_number)) out.order_number = a.order_number;
  if (typeof a.limit === "number" && Number.isInteger(a.limit)) out.limit = Math.min(100, Math.max(1, a.limit));
  return out;
}
