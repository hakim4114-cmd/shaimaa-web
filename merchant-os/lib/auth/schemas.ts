import { z } from "zod";

// bcrypt (used by Supabase Auth) ignores bytes beyond 72.
export const passwordSchema = z.string().min(10, "PASSWORD_TOO_SHORT").max(72, "PASSWORD_TOO_LONG");
export const emailSchema = z.string().trim().toLowerCase().email("EMAIL_INVALID").max(254, "EMAIL_INVALID");

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "PASSWORD_REQUIRED").max(72, "PASSWORD_TOO_LONG")
});

export const signUpSchema = z.object({
  email: emailSchema,
  password: passwordSchema
});

export const resetPasswordSchema = z
  .object({ password: passwordSchema, confirm: z.string() })
  .refine((value) => value.password === value.confirm, { message: "PASSWORD_MISMATCH", path: ["confirm"] });

export const slugPattern = /^[a-z0-9][a-z0-9-]{1,46}[a-z0-9]$/;

export const organizationSchema = z.object({
  name: z.string().trim().min(1, "NAME_REQUIRED").max(120, "NAME_TOO_LONG"),
  slug: z.string().trim().toLowerCase().regex(slugPattern, "SLUG_INVALID")
});

/** Suggests a URL-safe slug from an organization name (Latin letters only). */
export function suggestSlug(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)
    .replace(/-+$/g, "");
}

/** Only same-origin relative paths are accepted as post-login destinations. */
export function safeNextPath(value: unknown): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
    return "/";
  }
  return value;
}
