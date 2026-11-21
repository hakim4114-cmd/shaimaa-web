// A stand-in for the Sendit API, for the end-to-end tests only.
// Started by playwright.config.ts on 127.0.0.1; the app reaches it through
// SENDIT_API_BASE_URL, which the app accepts only for addresses on this machine.
// Real parcels are never created.
import { createServer } from "node:http";

const port = Number(process.env.SENDIT_MOCK_PORT ?? 4010);
export const mockKeys = { publicKey: "pk_e2e_mock_public", secretKey: "sk_e2e_mock_secret" };
const district = { id: 42, name: "Kénitra", ville: "Kénitra", arabic_name: "القنيطرة", price: 19, delais: "24h" };

/** code -> { code, status, payload } */
const deliveries = new Map();
/** code -> { code, status, amount, date, items } — COD payout invoices, added by the tests. */
const invoices = new Map();
let counter = 0;

function send(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

async function readJson(req) {
  let raw = "";
  for await (const chunk of req) raw += chunk;
  try {
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://127.0.0.1:${port}`);
  const path = url.pathname;

  // Test controls.
  if (path === "/__control/health") return send(res, 200, { ok: true });
  if (path === "/__control/deliveries" && req.method === "GET") return send(res, 200, { data: [...deliveries.values()] });
  const control = path.match(/^\/__control\/deliveries\/([^/]+)$/);
  if (control && req.method === "POST") {
    const parcel = deliveries.get(decodeURIComponent(control[1]));
    if (!parcel) return send(res, 404, { success: false });
    parcel.status = (await readJson(req)).status ?? parcel.status;
    return send(res, 200, { data: parcel });
  }

  if (path === "/__control/invoices" && req.method === "POST") {
    const invoice = await readJson(req);
    invoices.set(invoice.code, invoice);
    return send(res, 200, { data: invoice });
  }

  if (!path.startsWith("/api/v1/")) return send(res, 404, { success: false, message: "Page non trouvée" });
  const route = path.slice("/api/v1".length);

  if (route === "/login" && req.method === "POST") {
    const body = await readJson(req);
    if (body.public_key !== mockKeys.publicKey || body.secret_key !== mockKeys.secretKey) {
      return send(res, 401, { success: false, message: "Unauthenticated" });
    }
    return send(res, 200, { success: true, data: { token: "mock-token" } });
  }
  if (req.headers.authorization !== "Bearer mock-token") return send(res, 401, { success: false, message: "Unauthenticated" });

  if (route === "/districts/pickup-cities") return send(res, 200, { success: true, data: [{ id: district.id, name: district.name, arabic_name: district.arabic_name }] });
  if (route === "/districts") return send(res, 200, { success: true, data: [district], last_page: 1 });

  if (route === "/invoices") {
    const list = [...invoices.values()].map((invoice) => ({ code: invoice.code, status: invoice.status, amount: invoice.amount, date: invoice.date }));
    return send(res, 200, { success: true, data: list, last_page: 1 });
  }
  const invoiceRoute = route.match(/^\/invoices\/([^/]+)$/);
  if (invoiceRoute) {
    const invoice = invoices.get(decodeURIComponent(invoiceRoute[1]));
    return invoice ? send(res, 200, { success: true, data: invoice }) : send(res, 404, { success: false, message: "Page non trouvée" });
  }

  if (route === "/deliveries" && req.method === "POST") {
    const payload = await readJson(req);
    counter += 1;
    const code = `E2E${String(counter).padStart(6, "0")}`;
    deliveries.set(code, { code, status: "PENDING", payload });
    return send(res, 200, { success: true, data: { code, fee: district.price, status: "PENDING" } });
  }
  if (route === "/deliveries/getlabels" && req.method === "POST") {
    return send(res, 200, { success: true, data: { fileUrl: "https://example.invalid/e2e-label.pdf" } });
  }
  const one = route.match(/^\/deliveries\/([^/]+)$/);
  if (one) {
    const code = decodeURIComponent(one[1]);
    const parcel = deliveries.get(code);
    if (!parcel) return send(res, 404, { success: false, message: "Page non trouvée" });
    if (req.method === "DELETE") {
      deliveries.delete(code);
      return send(res, 200, { success: true });
    }
    return send(res, 200, { success: true, data: { code, status: parcel.status, last_action_at: new Date().toISOString() } });
  }
  return send(res, 404, { success: false, message: "Page non trouvée" });
});

server.listen(port, "127.0.0.1", () => console.log(`Sendit mock on http://127.0.0.1:${port}`));
