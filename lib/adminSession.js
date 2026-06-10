export const adminSessionCookieName = "maison_shaimaa_admin";
export const adminSessionMaxAgeSeconds = 60 * 60 * 8;

function getEncoder() {
  return new TextEncoder();
}

function bytesToBase64Url(bytes) {
  let binary = "";

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function signValue(value, secret) {
  if (!secret) {
    return "";
  }

  const encoder = getEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value));

  return bytesToBase64Url(new Uint8Array(signature));
}

export async function createAdminSessionValue(secret, issuedAt = Date.now()) {
  const expiresAt = issuedAt + adminSessionMaxAgeSeconds * 1000;
  const signature = await signValue(String(expiresAt), secret);

  return `${expiresAt}.${signature}`;
}

function timingSafeEqualStrings(a, b) {
  const encoder = getEncoder();
  const aBytes = encoder.encode(a);
  const bBytes = encoder.encode(b);

  if (aBytes.length !== bBytes.length) {
    return false;
  }

  let difference = 0;

  for (let index = 0; index < aBytes.length; index += 1) {
    difference |= aBytes[index] ^ bBytes[index];
  }

  return difference === 0;
}

export async function verifyAdminSessionValue(cookieValue, secret, now = Date.now()) {
  if (!cookieValue || !secret) {
    return false;
  }

  const [expiresAt, signature] = String(cookieValue).split(".");
  const expiresAtNumber = Number(expiresAt);

  if (!Number.isFinite(expiresAtNumber) || expiresAtNumber <= now || !signature) {
    return false;
  }

  const expectedSignature = await signValue(expiresAt, secret);

  return timingSafeEqualStrings(signature, expectedSignature);
}

export function getAdminCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: adminSessionMaxAgeSeconds
  };
}

export function getClearedAdminCookieOptions() {
  return {
    ...getAdminCookieOptions(),
    maxAge: 0
  };
}
