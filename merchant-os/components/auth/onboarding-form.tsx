"use client";

import { useActionState, useState } from "react";
import { createOrganization } from "@/app/onboarding/actions";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import type { FormState } from "@/lib/auth/errors";
import { suggestSlug } from "@/lib/auth/schemas";
import { useI18n } from "@/lib/i18n/provider";
import { FormAlert } from "./form-alert";

export function OnboardingForm() {
  const { t } = useI18n();
  const [state, action, pending] = useActionState<FormState, FormData>(createOrganization, undefined);
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const errorText = (code?: keyof typeof t.auth.errors) => (code ? t.auth.errors[code] : undefined);

  return (
    <form action={action} className="grid gap-4" noValidate>
      {state?.error ? <FormAlert>{errorText(state.error)}</FormAlert> : null}
      <Field label={t.onboarding.name} htmlFor="name" error={errorText(state?.fieldErrors?.name)}>
        <Input
          id="name"
          name="name"
          required
          defaultValue={state?.values?.name}
          key={state?.values?.name}
          maxLength={120}
          placeholder={t.onboarding.namePlaceholder}
          aria-invalid={Boolean(state?.fieldErrors?.name)}
          onChange={(event) => {
            if (!slugEdited) {
              setSlug(suggestSlug(event.target.value));
            }
          }}
        />
      </Field>
      <Field label={t.onboarding.slug} htmlFor="slug" hint={t.onboarding.slugHint} error={errorText(state?.fieldErrors?.slug)}>
        <Input
          id="slug"
          name="slug"
          dir="ltr"
          required
          maxLength={48}
          value={slug}
          aria-invalid={Boolean(state?.fieldErrors?.slug)}
          onChange={(event) => {
            setSlugEdited(true);
            setSlug(event.target.value.toLowerCase());
          }}
        />
      </Field>
      <p className="text-xs text-muted-foreground">{t.onboarding.currencyNote}</p>
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? t.common.loading : t.onboarding.submit}
      </Button>
    </form>
  );
}
