// Internal codes for auth/onboarding failures. User-facing text lives in the
// dictionaries under `auth.errors`; raw provider messages never reach the UI.
export const authErrorCodes = [
  "EMAIL_INVALID",
  "PASSWORD_REQUIRED",
  "PASSWORD_TOO_SHORT",
  "PASSWORD_TOO_LONG",
  "PASSWORD_MISMATCH",
  "PASSWORD_SAME",
  "INVALID_CREDENTIALS",
  "EMAIL_NOT_CONFIRMED",
  "EMAIL_NOT_ALLOWED",
  "WEAK_PASSWORD",
  "RATE_LIMITED",
  "NAME_REQUIRED",
  "NAME_TOO_LONG",
  "SLUG_INVALID",
  "SLUG_TAKEN",
  "NOT_CONFIGURED",
  "UNKNOWN"
] as const;

export type AuthErrorCode = (typeof authErrorCodes)[number];

export function isAuthErrorCode(value: unknown): value is AuthErrorCode {
  return typeof value === "string" && (authErrorCodes as readonly string[]).includes(value);
}

/** Maps a Supabase Auth error code (AuthError.code) to an internal code. */
export function mapSupabaseAuthError(code: string | undefined): AuthErrorCode {
  switch (code) {
    case "invalid_credentials":
      return "INVALID_CREDENTIALS";
    case "email_not_confirmed":
      return "EMAIL_NOT_CONFIRMED";
    case "weak_password":
      return "WEAK_PASSWORD";
    case "same_password":
      return "PASSWORD_SAME";
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
    case "over_sms_send_rate_limit":
      return "RATE_LIMITED";
    case "email_address_invalid":
      return "EMAIL_INVALID";
    case "email_address_not_authorized":
    case "signup_disabled":
      return "EMAIL_NOT_ALLOWED";
    default:
      return "UNKNOWN";
  }
}

export type FormState =
  | {
      error?: AuthErrorCode;
      fieldErrors?: Partial<Record<string, AuthErrorCode>>;
      /** Non-secret values echoed back so a failed submit does not clear the form. */
      values?: Record<string, string>;
    }
  | undefined;

export function zodFieldErrors(issues: { path: PropertyKey[]; message: string }[]): FormState {
  const fieldErrors: Partial<Record<string, AuthErrorCode>> = {};
  for (const issue of issues) {
    const field = String(issue.path[0] ?? "form");
    if (!fieldErrors[field]) {
      fieldErrors[field] = isAuthErrorCode(issue.message) ? issue.message : "UNKNOWN";
    }
  }
  return { fieldErrors };
}
