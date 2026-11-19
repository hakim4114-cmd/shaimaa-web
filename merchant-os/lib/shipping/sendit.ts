import "server-only";
import { madToCents } from "./sendit-core";

// Sendit REST client. Each organization has its own Sendit account: callers
// pass that organization's keys (lib/shipping/sendit-keys.ts reads them on the
// server). The token from POST /login is cached in memory per account and
// renewed on 401.
const baseUrl = "https://app.sendit.ma/api/v1";

export type SenditErrorCode = "SENDIT_NOT_CONFIGURED" | "SENDIT_AUTH_FAILED" | "SENDIT_REJECTED" | "SENDIT_UNAVAILABLE";

export class SenditError extends Error {
  constructor(
    public code: SenditErrorCode,
    public detail?: string
  ) {
    super(code);
  }
}

export type SenditKeys = { publicKey: string; secretKey: string };

const tokens = new Map<string, { value: string; expires: number }>();

async function call(keys: SenditKeys, path: string, init: RequestInit & { json?: unknown } = {}, auth = true): Promise<Record<string, unknown>> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (init.json !== undefined) headers["Content-Type"] = "application/json";
  if (auth) headers.Authorization = `Bearer ${await token(keys)}`;
  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      method: init.method ?? "GET",
      headers,
      body: init.json !== undefined ? JSON.stringify(init.json) : undefined,
      cache: "no-store",
      signal: AbortSignal.timeout(20000)
    });
  } catch {
    throw new SenditError("SENDIT_UNAVAILABLE");
  }
  if (response.status === 401 && auth) {
    tokens.delete(keys.publicKey);
    throw new SenditError("SENDIT_AUTH_FAILED");
  }
  const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok || body.success === false) {
    if (response.status >= 500) throw new SenditError("SENDIT_UNAVAILABLE");
    if (response.status === 401 || response.status === 403) throw new SenditError("SENDIT_AUTH_FAILED", describe(body));
    throw new SenditError("SENDIT_REJECTED", describe(body));
  }
  return body;
}

// Sendit error bodies carry "message" and sometimes "errors": { field: [msg] }.
function describe(body: Record<string, unknown>): string {
  const parts: string[] = [];
  if (typeof body.message === "string") parts.push(body.message);
  if (body.errors && typeof body.errors === "object") {
    for (const value of Object.values(body.errors as Record<string, unknown>)) {
      if (Array.isArray(value)) parts.push(...value.filter((v): v is string => typeof v === "string"));
      else if (typeof value === "string") parts.push(value);
    }
  }
  return parts.join(" — ").slice(0, 300);
}

async function token(keys: SenditKeys): Promise<string> {
  const cached = tokens.get(keys.publicKey);
  if (cached && cached.expires > Date.now()) return cached.value;
  const body = await call(keys, "/login", { method: "POST", json: { public_key: keys.publicKey, secret_key: keys.secretKey } }, false).catch((error: unknown) => {
    if (error instanceof SenditError && error.code === "SENDIT_REJECTED") throw new SenditError("SENDIT_AUTH_FAILED", error.detail);
    throw error;
  });
  const value = (body.data as { token?: unknown } | undefined)?.token;
  if (typeof value !== "string" || !value) throw new SenditError("SENDIT_AUTH_FAILED");
  // The token lifetime is not documented: renew every 45 minutes.
  tokens.set(keys.publicKey, { value, expires: Date.now() + 45 * 60 * 1000 });
  return value;
}

/** Retries once with a fresh token when the cached one was rejected. */
async function authed(keys: SenditKeys, path: string, init: RequestInit & { json?: unknown } = {}) {
  const hadToken = tokens.has(keys.publicKey);
  try {
    return await call(keys, path, init);
  } catch (error) {
    if (error instanceof SenditError && error.code === "SENDIT_AUTH_FAILED" && hadToken && !tokens.has(keys.publicKey)) {
      return call(keys, path, init);
    }
    throw error;
  }
}

export type SenditDistrict = { id: string; name: string; city: string; arabicName: string; feeCents: number; delay: string };

function toDistrict(raw: Record<string, unknown>): SenditDistrict {
  return {
    id: String(raw.id ?? ""),
    name: String(raw.name ?? ""),
    city: String(raw.ville ?? ""),
    arabicName: String(raw.arabic_name ?? ""),
    feeCents: madToCents(raw.price),
    delay: String(raw.delais ?? "")
  };
}

export async function searchDistricts(keys: SenditKeys, query: string, pickupDistrictId: number | null): Promise<SenditDistrict[]> {
  const params = new URLSearchParams({ querystring: query.slice(0, 60) });
  if (pickupDistrictId) params.set("pickup-district", String(pickupDistrictId));
  const body = await authed(keys, `/districts?${params}`);
  return (Array.isArray(body.data) ? body.data : []).map((row) => toDistrict(row as Record<string, unknown>)).filter((d) => d.id);
}

/** One page of the Sendit city list, with fees for the given pickup city. */
export async function listDistricts(keys: SenditKeys, page: number, pickupDistrictId: number | null): Promise<{ districts: SenditDistrict[]; lastPage: number }> {
  const params = new URLSearchParams({ page: String(Math.max(1, Math.floor(page))) });
  if (pickupDistrictId) params.set("pickup-district", String(pickupDistrictId));
  const body = await authed(keys, `/districts?${params}`);
  const districts = (Array.isArray(body.data) ? body.data : []).map((row) => toDistrict(row as Record<string, unknown>)).filter((d) => d.id);
  const meta = body.meta && typeof body.meta === "object" ? (body.meta as Record<string, unknown>) : {};
  return { districts, lastPage: Number(body.last_page ?? meta.last_page) || 1 };
}

export async function pickupCities(keys: SenditKeys): Promise<{ id: number; name: string; arabicName: string }[]> {
  const body = await authed(keys, "/districts/pickup-cities");
  return (Array.isArray(body.data) ? body.data : [])
    .map((row) => row as Record<string, unknown>)
    .map((row) => ({ id: Number(row.id), name: String(row.name ?? ""), arabicName: String(row.arabic_name ?? "") }))
    .filter((row) => Number.isInteger(row.id) && row.id > 0);
}

export async function createDelivery(keys: SenditKeys, payload: Record<string, unknown>): Promise<{ code: string; feeCents: number; status: string }> {
  const body = await authed(keys, "/deliveries", { method: "POST", json: payload });
  const data = (body.data ?? {}) as Record<string, unknown>;
  const code = typeof data.code === "string" ? data.code : "";
  if (!code) throw new SenditError("SENDIT_UNAVAILABLE", "no parcel code returned");
  return { code, feeCents: madToCents(data.fee), status: typeof data.status === "string" ? data.status : "PENDING" };
}

export async function deleteDelivery(keys: SenditKeys, code: string): Promise<void> {
  await authed(keys, `/deliveries/${encodeURIComponent(code)}`, { method: "DELETE" });
}

export async function getDelivery(keys: SenditKeys, code: string): Promise<{ status: string; raw: Record<string, unknown> }> {
  const body = await authed(keys, `/deliveries/${encodeURIComponent(code)}`);
  const data = (body.data ?? {}) as Record<string, unknown>;
  return { status: typeof data.status === "string" ? data.status : "", raw: data };
}

export async function getLabels(keys: SenditKeys, codes: string[], thermal: boolean): Promise<string> {
  const body = await authed(keys, "/deliveries/getlabels", { method: "POST", json: { codesToPrint: codes.join(","), printFormat: thermal ? 1 : 0 } });
  const data = body.data;
  const record = data && typeof data === "object" ? (data as Record<string, unknown>) : {};
  const found = [typeof data === "string" ? data : null, record.fileUrl, record.file_url, record.url, record.link, record.file, body.fileUrl, body.url].find(
    (v): v is string => typeof v === "string" && v.trim() !== ""
  );
  if (!found) {
    // Say what came back, so the cause can be found (no secrets in this response).
    const shape = `keys: ${Object.keys(body).join(",")}${Object.keys(record).length ? ` / data: ${Object.keys(record).join(",")}` : ""}${typeof body.message === "string" ? ` — ${body.message}` : ""}`;
    throw new SenditError("SENDIT_UNAVAILABLE", `no label file returned (${shape})`.slice(0, 300));
  }
  const url = found.trim();
  if (/^https?:\/\//i.test(url)) return url.replace(/^http:\/\//i, "https://");
  return `https://app.sendit.ma${url.startsWith("/") ? "" : "/"}${url}`;
}

export async function requestPickup(keys: SenditKeys, input: { districtId: number; name: string; phone: string; address: string; note: string; codes: string[] }): Promise<string> {
  const body = await authed(keys, "/pickups", {
    method: "POST",
    json: { district_id: input.districtId, name: input.name, phone: input.phone, address: input.address, note: input.note || "-", deliveries: input.codes.join(",") }
  });
  const code = (body.data as { code?: unknown } | undefined)?.code;
  return typeof code === "string" ? code : "";
}

export type SenditInvoiceSummary = { code: string; status: string; amountCents: number; date: string };

export async function listInvoices(keys: SenditKeys, page = 1): Promise<{ invoices: SenditInvoiceSummary[]; lastPage: number }> {
  const body = await authed(keys, `/invoices?page=${Math.max(1, Math.floor(page))}`);
  const invoices = (Array.isArray(body.data) ? body.data : [])
    .map((row) => row as Record<string, unknown>)
    .map((row) => ({ code: String(row.code ?? ""), status: String(row.status ?? ""), amountCents: madToCents(row.amount), date: String(row.date ?? "").slice(0, 10) }))
    .filter((row) => row.code);
  return { invoices, lastPage: Number(body.last_page) || 1 };
}

export async function getInvoice(keys: SenditKeys, code: string): Promise<SenditInvoiceSummary & { items: unknown }> {
  const body = await authed(keys, `/invoices/${encodeURIComponent(code)}`);
  const data = (body.data ?? {}) as Record<string, unknown>;
  return { code: String(data.code ?? code), status: String(data.status ?? ""), amountCents: madToCents(data.amount), date: String(data.date ?? "").slice(0, 10), items: data.items };
}
