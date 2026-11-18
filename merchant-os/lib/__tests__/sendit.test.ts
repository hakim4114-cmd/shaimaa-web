import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildDeliveryPayload, madToCents, pickDistrictForCity, mapSenditStatus, readSenditSettings, senditStatuses, toSenditPhone, verifySenditSignature } from "@/lib/shipping/sendit-core";

describe("Sendit status mapping", () => {
  it("covers every documented status", () => {
    for (const status of senditStatuses) {
      expect(() => mapSenditStatus(status)).not.toThrow();
    }
    expect(mapSenditStatus("PICKEDUP")).toBe("picked_up");
    expect(mapSenditStatus("DELIVERING")).toBe("out_for_delivery");
    expect(mapSenditStatus("UNREACHABLE")).toBe("failed_attempt");
    expect(mapSenditStatus("POSTPONED")).toBeNull();
    expect(mapSenditStatus("DELIVERED")).toBe("delivered");
    expect(mapSenditStatus("REJECTED")).toBe("returned_to_sender");
    expect(mapSenditStatus("SOMETHING_NEW")).toBeNull();
  });
});

describe("Sendit webhook signature", () => {
  const body = '{"event":"delivery.status.update","code":"DHF420101C","newStatus":"DELIVERED"}';
  const secret = "secret-key";
  const hex = createHmac("sha256", secret).update(body).digest("hex");
  const b64 = createHmac("sha256", secret).update(body).digest("base64");

  it("accepts hex and base64 signatures made with a configured key", () => {
    expect(verifySenditSignature(body, hex, ["public", secret])).toBe(true);
    expect(verifySenditSignature(body, b64, [secret])).toBe(true);
    expect(verifySenditSignature(body, `sha256=${hex}`, [secret])).toBe(true);
  });

  it("rejects missing, wrong or tampered signatures", () => {
    expect(verifySenditSignature(body, null, [secret])).toBe(false);
    expect(verifySenditSignature(body, hex, ["other"])).toBe(false);
    expect(verifySenditSignature(body.replace("DELIVERED", "REJECTED"), hex, [secret])).toBe(false);
    expect(verifySenditSignature(body, hex, [undefined])).toBe(false);
  });
});

describe("Sendit payload", () => {
  it("builds a parcel from an order", () => {
    const settings = readSenditSettings({ pickup_district_id: 120, allow_open: true, allow_try: true });
    const payload = buildDeliveryPayload(
      {
        orderNumber: "MOS-000021",
        fullName: "Amina",
        phone: "+212612345678",
        address: "Hay Salam",
        codAmountCents: 18450,
        notes: "Appeler avant",
        items: [{ productName: "Card holder", variantTitle: "Brown", quantity: 2 }]
      },
      77,
      settings
    );
    expect(payload).toMatchObject({
      pickup_district_id: 120,
      district_id: 77,
      amount: 184.5,
      phone: "0612345678",
      reference: "MOS-000021",
      allow_open: 1,
      allow_try: 1,
      products_from_stock: 0,
      products: "Card holder (Brown) x2"
    });
  });

  it("marks exchange parcels with the original parcel code", () => {
    const payload = buildDeliveryPayload(
      { orderNumber: "MOS-2", fullName: "A", phone: "+212612345678", address: "x", codAmountCents: 5500, notes: "", items: [] },
      77,
      readSenditSettings({}),
      "DHX001"
    );
    expect(payload).toMatchObject({ option_exchange: 1, delivery_exchange_id: "DHX001", amount: 55 });
  });

  it("defaults to allowing opening and trying, and reads options safely", () => {
    expect(readSenditSettings(null)).toMatchObject({ allowOpen: true, allowTry: true, pickupDistrictId: null });
    expect(readSenditSettings({ allow_try: false, pickup_district_id: "x" })).toMatchObject({ allowTry: false, pickupDistrictId: null });
  });

  it("converts phones and amounts", () => {
    expect(toSenditPhone("+212700112233")).toBe("0700112233");
    expect(madToCents("35")).toBe(3500);
    expect(madToCents(35.5)).toBe(3550);
    expect(madToCents("abc")).toBe(0);
  });
});

import { previewInvoice, readInvoiceLines } from "@/lib/shipping/sendit-core";
import { resolveRange } from "@/lib/ranges";

describe("Sendit invoice preview", () => {
  const lines = readInvoiceLines([
    { type: "delivery", code: "DH1", status: "DELIVERED", amount: "435.00", fee: "30.00" },
    { type: "delivery", code: "DH2", status: "REJECTED", amount: "0.00", fee: "30.00" },
    { type: "pickup", code: "PH1", date: "2026-11-17", fee: 0 },
    { type: "extra", code: "AH1", label: "avoir", paid_by_sendit: "Oui", amount: "10.00" }
  ]);
  const parcels = new Map([["DH1", { orderId: "o1", orderNumber: "MOS-1", codAmountCents: 43500, paymentStatus: "awaiting_remittance" }]]);

  it("settles matching deliveries and explains the other lines", () => {
    const p = previewInvoice(38500, lines, parcels);
    expect(p.settle).toEqual([{ trackingNumber: "DH1", orderNumber: "MOS-1", collectedCents: 43500, feeCents: 3000 }]);
    expect(p.impliedOtherCents).toBe(2000);
    expect(p.explainedOtherCents).toBe(2000);
    expect(p.mismatches).toHaveLength(0);
  });

  it("flags amount mismatches and unknown parcels", () => {
    const wrong = new Map([["DH1", { orderId: "o1", orderNumber: "MOS-1", codAmountCents: 40000, paymentStatus: "awaiting_remittance" }]]);
    const p = previewInvoice(38500, lines, wrong);
    expect(p.mismatches[0]).toMatchObject({ trackingNumber: "DH1", expectedCents: 40000, invoicedCents: 43500 });
    expect(previewInvoice(0, lines, new Map()).unknown).toEqual(["DH1"]);
  });
});

describe("date ranges", () => {
  const now = new Date("2026-11-17T10:00:00Z");
  it("resolves presets in Moroccan days", () => {
    expect(resolveRange("today", now)).toEqual({ from: "2026-11-17", to: "2026-11-17" });
    expect(resolveRange("7d", now)).toEqual({ from: "2026-11-11", to: "2026-11-17" });
    expect(resolveRange("month", now)).toEqual({ from: "2026-11-01", to: "2026-11-17" });
    expect(resolveRange("last_month", now)).toEqual({ from: "2026-10-01", to: "2026-10-31" });
    expect(resolveRange("last_month", new Date("2026-03-05T10:00:00Z"))).toEqual({ from: "2026-02-01", to: "2026-02-28" });
  });
});

import { monthRange, weekRange, weekStart } from "@/lib/ranges";

describe("weeks and months", () => {
  const now = new Date("2026-11-19T10:00:00Z"); // a Thursday
  it("uses ISO weeks starting on Monday", () => {
    expect(weekStart("2026-11-19")).toBe("2026-11-16");
    expect(weekStart("2026-11-16")).toBe("2026-11-16");
    expect(weekStart("2026-11-22")).toBe("2026-11-16");
    expect(weekRange(0, now)).toEqual({ from: "2026-11-16", to: "2026-11-22" });
    expect(weekRange(1, now)).toEqual({ from: "2026-11-09", to: "2026-11-15" });
  });
  it("resolves calendar months", () => {
    expect(monthRange(0, now)).toEqual({ from: "2026-11-01", to: "2026-11-30" });
    expect(monthRange(1, now)).toEqual({ from: "2026-10-01", to: "2026-10-31" });
    expect(monthRange(10, now)).toEqual({ from: "2026-01-01", to: "2026-01-31" });
  });
});

describe("pickDistrictForCity", () => {
  const d = (id: string, name: string, city: string) => ({ id, name, city });
  it("takes the only district of a city", () => {
    expect(pickDistrictForCity("Sidi Slimane", [d("1", "Sidi Slimane - Centre", "Sidi Slimane"), d("2", "Kénitra", "Kénitra")])?.id).toBe("1");
  });
  it("takes the district named like the city when the city has several", () => {
    const list = [d("3", "Kénitra - Saknia", "Kénitra"), d("4", "Kenitra", "Kénitra"), d("5", "Kénitra - Maamora", "Kénitra")];
    expect(pickDistrictForCity("kenitra", list)?.id).toBe("4");
  });
  it("never guesses", () => {
    const list = [d("6", "Casablanca - Maarif", "Casablanca"), d("7", "Casablanca - Sidi Maarouf", "Casablanca")];
    expect(pickDistrictForCity("Casablanca", list)).toBeNull();
    expect(pickDistrictForCity("", list)).toBeNull();
    expect(pickDistrictForCity("Rabat", list)).toBeNull();
  });
});
