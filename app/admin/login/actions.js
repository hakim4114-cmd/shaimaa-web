"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createAdminSessionValue, getAdminCookieOptions, adminSessionCookieName } from "@/lib/adminSession";

async function hashText(value) {
  const encodedValue = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", encodedValue);

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function isValidPassword(inputPassword, expectedPassword) {
  if (!inputPassword || !expectedPassword) {
    return false;
  }

  const [inputHash, expectedHash] = await Promise.all([hashText(inputPassword), hashText(expectedPassword)]);

  return inputHash === expectedHash;
}

export async function loginAdmin(formData) {
  const inputPassword = String(formData.get("password") || "");
  const expectedPassword = process.env.ADMIN_PASSWORD || "";
  const sessionSecret = process.env.ADMIN_SESSION_SECRET || "";

  if (!(await isValidPassword(inputPassword, expectedPassword)) || !sessionSecret) {
    redirect("/admin/login?error=1");
  }

  const cookieStore = await cookies();
  const sessionValue = await createAdminSessionValue(sessionSecret);

  cookieStore.set(adminSessionCookieName, sessionValue, getAdminCookieOptions());
  redirect("/admin");
}
