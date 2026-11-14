"use client";

import Link from "next/link";
import { useActionState } from "react";
import { resendCode, signIn, signUp } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import type { AuthErrorCode, FormState } from "@/lib/auth/errors";
import { useI18n } from "@/lib/i18n/provider";
import { FormAlert } from "./form-alert";

function useErrorText() {
  const { t } = useI18n();
  return (code: AuthErrorCode | undefined) => (code ? t.auth.errors[code] : undefined);
}

export function SignInForm({ next, initialError }: { next: string; initialError?: string }) {
  const { t } = useI18n();
  const errorText = useErrorText();
  const [state, action, pending] = useActionState<FormState, FormData>(signIn, undefined);

  return (
    <form action={action} className="grid gap-4" noValidate>
      {state?.error ? <FormAlert>{errorText(state.error)}</FormAlert> : initialError ? <FormAlert>{initialError}</FormAlert> : null}
      <input type="hidden" name="next" value={next} />
      <Field label={t.auth.email} htmlFor="email" error={errorText(state?.fieldErrors?.email)}>
        <Input id="email" name="email" type="email" autoComplete="email" dir="ltr" required defaultValue={state?.values?.email} key={state?.values?.email} aria-invalid={Boolean(state?.fieldErrors?.email)} />
      </Field>
      <Field label={t.auth.password} htmlFor="password" error={errorText(state?.fieldErrors?.password)}>
        <Input id="password" name="password" type="password" autoComplete="current-password" dir="ltr" required aria-invalid={Boolean(state?.fieldErrors?.password)} />
      </Field>
      <Button type="submit" disabled={pending} className="mt-1 w-full">
        {pending ? t.common.loading : t.auth.signInButton}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        {t.auth.noAccount}{" "}
        <Link href="/sign-up" className="font-medium text-accent hover:underline">
          {t.auth.goSignUp}
        </Link>
      </p>
    </form>
  );
}

export function SignUpForm() {
  const { t } = useI18n();
  const errorText = useErrorText();
  const [state, action, pending] = useActionState<FormState, FormData>(signUp, undefined);

  return (
    <form action={action} className="grid gap-4" noValidate>
      {state?.error ? <FormAlert>{errorText(state.error)}</FormAlert> : null}
      <Field label={t.auth.email} htmlFor="email" error={errorText(state?.fieldErrors?.email)}>
        <Input id="email" name="email" type="email" autoComplete="email" dir="ltr" required defaultValue={state?.values?.email} key={state?.values?.email} aria-invalid={Boolean(state?.fieldErrors?.email)} />
      </Field>
      <Field label={t.auth.password} htmlFor="password" hint={t.auth.passwordHint} error={errorText(state?.fieldErrors?.password)}>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={10}
          maxLength={72}
          dir="ltr"
          required
          aria-invalid={Boolean(state?.fieldErrors?.password)}
        />
      </Field>
      <Button type="submit" disabled={pending} className="mt-1 w-full">
        {pending ? t.common.loading : t.auth.signUpButton}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        {t.auth.haveAccount}{" "}
        <Link href="/sign-in" className="font-medium text-accent hover:underline">
          {t.auth.goSignIn}
        </Link>
      </p>
    </form>
  );
}

export function ResendConfirmation({ email, next }: { email: string; next: string }) {
  const { t } = useI18n();
  const errorText = useErrorText();
  const [state, action, pending] = useActionState(resendCode, undefined);

  return (
    <div className="grid gap-4">
      {state?.error ? <FormAlert>{errorText(state.error)}</FormAlert> : null}
      {state?.sent ? <FormAlert tone="success">{t.auth.resent}</FormAlert> : null}
      <form action={action}>
        <input type="hidden" name="email" value={email} />
        <input type="hidden" name="next" value={next} />
        <Button type="submit" variant="secondary" disabled={pending} className="w-full">
          {pending ? t.common.loading : t.auth.resend}
        </Button>
      </form>
      <p className="text-center text-sm text-muted-foreground">
        <Link href="/sign-in" className="font-medium text-accent hover:underline">
          {t.auth.goSignIn}
        </Link>
      </p>
    </div>
  );
}
