import "server-only";
import { madToCents } from "./sendit-core";

// Sendit REST client. Keys are server-only environment variables; the token
// from POST /login is cached in memory and renewed on 401.
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

export function senditKeys() {
  const publicKey = process.env.SENDIT_PUBLIC_KEY?.trim();
  const secretKey = process.env.SENDIT_SECRET_KEY?.trim();
  return publicKey && secretKey ? { publicKey, secretKey } : null;
}

let cachedToken: { value: string; expires: number } | null = null;

async function call(path: string, init: RequestInit & { json?: unknown } = {}, auth = true): Promise<Record<string, unknown>> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (init.json !== undefined) headers["Content-Type"] = "application/json";
  if (auth) headers.Authorization = `Bearer ${await token()}`;
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
    cachedToken = null;
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

async function token(): Promise<string> {
  if (cachedToken && cachedToken.expires > Date.now()) return cachedToken.value;
  const keys = senditKeys();
  if (!keys) throw new SenditError("SENDIT_NOT_CONFIGURED");
  const body = await call("/login", { method: "POST", json: { public_key: keys.publicKey, secret_key: keys.secretKey } }, false).catch((error: unknown) => {
    if (error instanceof SenditError && error.code === "SENDIT_REJECTED") throw new SenditError("SENDIT_AUTH_FAILED", error.detail);
    throw error;
  });
  const value = (body.data as { token?: unknown } | undefined)?.token;
  if (typeof value !== "string" || !value) throw new SenditError("SENDIT_AUTH_FAILED");
  // The token lifetime is not documented: renew every 45 minutes.
  cachedToken = { value, expires: Date.now() + 45 * 60 * 1000 };
  return value;
}

/** Retries once with a fresh token when the cached one was rejected. */
async function authed(path: string, init: RequestInit & { json?: unknown } = {}) {
  try {
    return await call(path, init);
  } catch (error) {
    if (error instanceof SenditError && error.code === "SENDIT_AUTH_FAILED" && cachedToken === null && senditKeys()) {
      return call(path, init);
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

export async function searchDistricts(query: string, pickupDistrictId: number | null): Promise<SenditDistrict[]> {
  const params = new URLSearchParams({ querystring: query.slice(0, 60) });
  if (pickupDistrictId) params.set("pickup-district", String(pickupDistrictId));
  const body = await authed(`/districts?${params}`);
  return (Array.isArray(body.data) ? body.data : []).map((row) => toDistrict(row as Record<string, unknown>)).filter((d) => d.id);
}

export async function pickupCities(): Promise<{ id: number; name: string; arabicName: string }[]> {
  const body = await authed("/districts/pickup-cities");
  return (Array.isArray(body.data) ? body.data : [])
    .map((row) => row as Record<string, unknown>)
    .map((row) => ({ id: Number(row.id), name: String(row.name ?? ""), arabicName: String(row.arabic_name ?? "") }))
    .filter((row) => Number.isInteger(row.id) && row.id > 0);
}

export async function createDelivery(payload: Record<string, unknown>): Promise<{ code: string; feeCents: number; status: string }> {
  const body = await authed("/deliveries", { method: "POST", json: payload });
  const data = (body.data ?? {}) as Record<string, unknown>;
  const code = typeof data.code === "string" ? data.code : "";
  if (!code) throw new SenditError("SENDIT_UNAVAILABLE", "no parcel code returned");
  return { code, feeCents: madToCents(data.fee), status: typeof data.status === "string" ? data.status : "PENDING" };
}

export async function deleteDelivery(code: string): Promise<void> {
  await authed(`/deliveries/${encodeURIComponent(code)}`, { method: "DELETE" });
}

export async function getDelivery(code: string): Promise<{ status: string; raw: Record<string, unknown> }> {
  const body = await authed(`/deliveries/${encodeURIComponent(code)}`);
  const data = (body.data ?? {}) as Record<string, unknown>;
  return { status: typeof data.status === "string" ? data.status : "", raw: data };
}

export async function getLabels(codes: string[], thermal: boolean): Promise<string> {
  const body = await authed("/deliveries/getlabels", { method: "POST", json: { codesToPrint: codes.join(","), printFormat: thermal ? 1 : 0 } });
  const url = (body.data as { fileUrl?: unknown } | undefined)?.fileUrl;
  if (typeof url !== "string" || !url.startsWith("https://")) throw new SenditError("SENDIT_UNAVAILABLE", "no label file returned");
  return url;
}

export async function requestPickup(input: { districtId: number; name: string; phone: string; address: string; note: string; codes: string[] }): Promise<string> {
  const body = await authed("/pickups", {
    method: "POST",
    json: { district_id: input.districtId, name: input.name, phone: input.phone, address: input.address, note: input.note || "-", deliveries: input.codes.join(",") }
  });
  const code = (body.data as { code?: unknown } | undefined)?.code;
  return typeof code === "string" ? code : "";
}
