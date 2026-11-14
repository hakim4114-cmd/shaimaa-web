"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { mapSupabaseAuthError, zodFieldErrors, type AuthErrorCode, type FormState } from "@/lib/auth/errors";
import { emailSchema, safeNextPath, signInSchema, signUpSchema } from "@/lib/auth/schemas";
import { activeOrganizationCookieName } from "@/lib/auth/session";
import { getSupabasePublicConfig } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Absolute URL of /auth/confirm on the origin serving this request. Supabase
 * only redirects to URLs on the project's allow list (Auth → URL
 * Configuration), so every deployment origin must be added there.
 */
async function confirmRedirectUrl(next: string) {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  let origin = configured || "";
  if (!origin) {
    const headerList = await headers();
    const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
    const proto = headerList.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
    origin = host ? `${proto}://${host}` : "";
  }
  const url = new URL("/auth/confirm", origin);
  if (next !== "/") {
    url.searchParams.set("next", next);
  }
  return url.toString();
}

function verifyUrl(email: string, next?: string) {
  const params = new URLSearchParams({ email });
  if (next && next !== "/") {
    params.set("next", next);
  }
  return `/verify?${params.toString()}`;
}

export async function signIn(_state: FormState, formData: FormData): Promise<FormState> {
  if (!getSupabasePublicConfig()) {
    return { error: "NOT_CONFIGURED", values: { email: String(formData.get("email") ?? "") } };
  }
  const values = { email: String(formData.get("email") ?? "") };
  const parsed = signInSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) {
    return { ...zodFieldErrors(parsed.error.issues), values };
  }
  const next = safeNextPath(formData.get("next"));
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    const code = mapSupabaseAuthError(error.code);
    if (code === "EMAIL_NOT_CONFIRMED") {
      redirect(verifyUrl(parsed.data.email, next));
    }
    return { error: code, values };
  }
  redirect(next);
}

export async function signUp(_state: FormState, formData: FormData): Promise<FormState> {
  if (!getSupabasePublicConfig()) {
    return { error: "NOT_CONFIGURED", values: { email: String(formData.get("email") ?? "") } };
  }
  const values = { email: String(formData.get("email") ?? "") };
  const parsed = signUpSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) {
    return { ...zodFieldErrors(parsed.error.issues), values };
  }
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    ...parsed.data,
    options: { emailRedirectTo: await confirmRedirectUrl("/") }
  });
  if (error) {
    return { error: mapSupabaseAuthError(error.code), values };
  }
  // With email confirmation on, there is no session yet: the user confirms
  // with the code (or link) from the email. Supabase answers the same way for
  // already-registered addresses, so this page never reveals whether an
  // account exists.
  if (data.session) {
    redirect("/");
  }
  redirect(verifyUrl(parsed.data.email));
}

export type ResendState = { sent?: boolean; error?: AuthErrorCode } | undefined;

export async function resendCode(_state: ResendState, formData: FormData): Promise<ResendState> {
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) {
    return { error: "EMAIL_INVALID" };
  }
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: parsed.data,
    options: { emailRedirectTo: await confirmRedirectUrl(safeNextPath(formData.get("next"))) }
  });
  if (error) {
    return { error: mapSupabaseAuthError(error.code) };
  }
  return { sent: true };
}

export async function signOut() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  (await cookies()).delete(activeOrganizationCookieName);
  redirect("/sign-in");
}
