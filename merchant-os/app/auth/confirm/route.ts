import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { safeNextPath } from "@/lib/auth/schemas";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const otpTypes: EmailOtpType[] = ["signup", "email", "invite", "magiclink", "recovery", "email_change"];

/**
 * Target of the confirmation link in Supabase emails. Supports both the PKCE
 * `code` redirect and the `token_hash` template variant.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const next = safeNextPath(searchParams.get("next"));
  const supabase = await createSupabaseServerClient();

  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  let ok = false;
  if (code) {
    ok = !(await supabase.auth.exchangeCodeForSession(code)).error;
  } else if (tokenHash && type && otpTypes.includes(type)) {
    ok = !(await supabase.auth.verifyOtp({ token_hash: tokenHash, type })).error;
  }

  return NextResponse.redirect(new URL(ok ? next : "/sign-in?error=link", origin));
}
