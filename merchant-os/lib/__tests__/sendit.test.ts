import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildDeliveryPayload, madToCents, mapSenditStatus, readSenditSettings, senditStatuses, toSenditPhone, verifySenditSignature } from "@/lib/shipping/sendit-core";

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
