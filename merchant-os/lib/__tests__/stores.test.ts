import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { parseCustomerMessage } from "@/lib/orders/paste";
import { isWooPing, parseStoreDelivery, toCents, verifyStoreSignature } from "@/lib/integrations/stores";

const secret = "shpss_0123456789abcdef";
const sign = (body: string, encoding: "hex" | "base64") => createHmac("sha256", secret).update(body, "utf8").digest(encoding);

describe("verifyStoreSignature", () => {
  const body = JSON.stringify({ id: 1 });
  it("accepts base64 (Shopify, WooCommerce) and hex (custom)", () => {
    expect(verifyStoreSignature(body, sign(body, "base64"), secret)).toBe(true);
    expect(verifyStoreSignature(body, sign(body, "hex"), secret)).toBe(true);
  });
  it("rejects a wrong secret, a changed body and a missing signature", () => {
    expect(verifyStoreSignature(body, sign(body, "base64"), "another-secret-1234")).toBe(false);
    expect(verifyStoreSignature(`${body} `, sign(body, "base64"), secret)).toBe(false);
    expect(verifyStoreSignature(body, null, secret)).toBe(false);
    expect(verifyStoreSignature(body, sign(body, "hex"), null)).toBe(false);
  });
});

describe("toCents", () => {
  it("converts store amounts", () => {
    expect(toCents("149.90")).toBe(14990);
    expect(toCents(0.1 + 0.2)).toBe(30);
    expect(toCents("abc")).toBe(0);
    expect(toCents(-5)).toBe(0);
  });
});

describe("Shopify orders/create", () => {
  const order = {
    id: 5550001,
    name: "#1001",
    currency: "MAD",
    financial_status: "pending",
    phone: null,
    note: "Après 18h",
    total_discounts: "20.00",
    total_shipping_price_set: { shop_money: { amount: "35.00", currency_code: "MAD" } },
    customer: { first_name: "Salma", last_name: "B", phone: null },
    shipping_address: { first_name: "Salma", last_name: "Bennani", address1: "Rue 5", address2: "Appt 2", city: "Kénitra", phone: "06 11 22 33 44" },
    line_items: [{ sku: "WAL-BLK", title: "Wallet", variant_title: "Noir", quantity: 2, price: "149.00" }]
  };
  it("maps the order", () => {
    const parsed = parseStoreDelivery("shopify", JSON.stringify(order), "orders/create");
    expect(parsed).toEqual({
      kind: "order",
      order: {
        external_id: "5550001",
        number: "#1001",
        currency: "MAD",
        paid: false,
        customer: { full_name: "Salma Bennani", phone: "+212611223344", city: "Kénitra", address: "Rue 5 Appt 2" },
        items: [{ sku: "WAL-BLK", title: "Wallet Noir", quantity: 2, unit_price_cents: 14900 }],
        shipping_cents: 3500,
        discount_cents: 2000,
        note: "Après 18h"
      }
    });
  });
  it("marks paid orders and ignores other topics", () => {
    const parsed = parseStoreDelivery("shopify", JSON.stringify({ ...order, financial_status: "paid" }), "orders/create");
    expect(parsed.kind === "order" && parsed.order.paid).toBe(true);
    expect(parseStoreDelivery("shopify", JSON.stringify(order), "orders/updated").kind).toBe("ignore");
  });
  it("falls back to shipping lines and keeps an invalid phone as typed", () => {
    const rest: Partial<typeof order> = { ...order };
    delete rest.total_shipping_price_set;
    const parsed = parseStoreDelivery(
      "shopify",
      JSON.stringify({ ...rest, shipping_lines: [{ price: "20.00" }, { price: "5.00" }], shipping_address: { ...order.shipping_address, phone: "12345" } }),
      null
    );
    expect(parsed.kind === "order" && parsed.order.shipping_cents).toBe(2500);
    expect(parsed.kind === "order" && parsed.order.customer.phone).toBe("12345");
  });
});

describe("WooCommerce order.created", () => {
  const order = {
    id: 812,
    number: "812",
    currency: "MAD",
    payment_method: "cod",
    date_paid: null,
    discount_total: "10.00",
    shipping_total: "30.00",
    customer_note: "",
    billing: { first_name: "Youssef", last_name: "A", phone: "+212 7 12 34 56 78", city: "Rabat", address_1: "Agdal" },
    shipping: { first_name: "", last_name: "", address_1: "", city: "", phone: "" },
    line_items: [{ sku: "BELT-1", name: "Belt", quantity: 2, subtotal: "240.00", total: "230.00", price: 115 }]
  };
  it("maps the order, using billing when shipping is empty", () => {
    const parsed = parseStoreDelivery("woocommerce", JSON.stringify(order), "order.created");
    expect(parsed.kind).toBe("order");
    if (parsed.kind !== "order") return;
    expect(parsed.order.customer).toEqual({ full_name: "Youssef A", phone: "+212712345678", city: "Rabat", address: "Agdal" });
    expect(parsed.order.items).toEqual([{ sku: "BELT-1", title: "Belt", quantity: 2, unit_price_cents: 12000 }]);
    expect(parsed.order.discount_cents).toBe(1000);
    expect(parsed.order.shipping_cents).toBe(3000);
    expect(parsed.order.paid).toBe(false);
  });
  it("recognizes the ping sent when the webhook is saved", () => {
    expect(isWooPing("webhook_id=42")).toBe(true);
    expect(isWooPing(JSON.stringify(order))).toBe(false);
  });
});

describe("custom site", () => {
  it("maps the documented format", () => {
    const body = {
      id: "A-77",
      currency: "MAD",
      customer: { name: "Hind", phone: "0611223344", city: "Fès", address: "Narjiss" },
      items: [{ sku: "BAG-2", title: "Bag", quantity: 1, price: 399 }],
      shipping: 0,
      discount: 0
    };
    const parsed = parseStoreDelivery("custom", JSON.stringify(body), null);
    expect(parsed.kind === "order" && parsed.order.number).toBe("A-77");
    expect(parsed.kind === "order" && parsed.order.items[0]?.unit_price_cents).toBe(39900);
    expect(parsed.kind === "order" && parsed.order.customer.phone).toBe("+212611223344");
  });
  it("rejects bodies without an id or not JSON", () => {
    expect(parseStoreDelivery("custom", "{}", null).kind).toBe("invalid");
    expect(parseStoreDelivery("custom", "nope", null).kind).toBe("invalid");
    expect(parseStoreDelivery("youcan", "{}", null).kind).toBe("ignore");
  });
});


describe("paste the customer's message", () => {
  const cities = [
    { id: 1, nameFr: "Kénitra", nameAr: "القنيطرة", aliases: ["kenitra", "knitra"] },
    { id: 2, nameFr: "Casablanca", nameAr: "الدار البيضاء", aliases: ["casa", "dar bida"] },
    { id: 3, nameFr: "Salé", nameAr: "سلا", aliases: ["sale", "sla"] }
  ];
  it("reads a labelled Arabic message", () => {
    const parsed = parseCustomerMessage("الاسم: سلمى بناني\nالهاتف: 06 11 22 33 44\nالمدينة: القنيطرة\nالعنوان: حي الساكنية زنقة 5 رقم 12", cities);
    expect(parsed).toEqual({ phone: "+212611223344", cityId: 1, fullName: "سلمى بناني", address: "حي الساكنية زنقة 5 رقم 12" });
  });
  it("reads an unlabelled Darija/French message", () => {
    const parsed = parseCustomerMessage("Youssef Alami\n0712-345-678\nCasa, Maarif rue 12 n 4", cities);
    expect(parsed.phone).toBe("+212712345678");
    expect(parsed.cityId).toBe(2);
    expect(parsed.fullName).toBe("Youssef Alami");
    expect(parsed.address).toBe("Casa, Maarif rue 12 n 4");
  });
  it("accepts +212 numbers and leaves unknown parts empty", () => {
    const parsed = parseCustomerMessage("salam bghit had lmontaj +212 6 12 34 56 78", cities);
    expect(parsed.phone).toBe("+212612345678");
    expect(parsed.cityId).toBeNull();
  });
  it("does not match a city inside another word", () => {
    expect(parseCustomerMessage("salade", cities).cityId).toBeNull();
    expect(parseCustomerMessage("ana f sla", cities).cityId).toBe(3);
  });
});
