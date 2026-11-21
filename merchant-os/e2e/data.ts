// Test data shared by the journeys. The files run in order (01, 02, 03…):
// the catalogue journey creates the product the order journey sells.
export const shirt = { name: "Chemise E2E", sizes: ["M", "L"], price: "199", cost: "80" };

export const customer = {
  message: "الاسم: سلمى بناني\nالهاتف: 06 11 22 33 44\nالمدينة: القنيطرة\nالعنوان: حي الساكنية زنقة 5 رقم 12",
  name: "سلمى بناني",
  phone: "0611223344"
};

/** A Shopify orders/create body as Shopify sends it (used by 06 and 09). */
export const shopifySigningKey = "e2e-shopify-signing-key-0123456789";

export function shopifyOrder(id: number, sku: string) {
  return {
    id,
    name: `#${id}`,
    currency: "MAD",
    financial_status: "pending",
    phone: null,
    note: "E2E",
    total_discounts: "0.00",
    total_shipping_price_set: { shop_money: { amount: "0.00", currency_code: "MAD" } },
    customer: { first_name: "Amal", last_name: "Test", phone: null },
    shipping_address: { first_name: "Amal", last_name: "Test", address1: "Rue 7", address2: "", city: "Kénitra", phone: "06 55 66 77 88" },
    line_items: [{ sku, title: "Chemise E2E", variant_title: "M", quantity: 1, price: "199.00" }]
  };
}
