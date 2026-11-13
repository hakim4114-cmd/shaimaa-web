// Moroccan phone numbers are stored in E.164 form: +212 followed by nine
// digits starting with 5 (landline), 6 or 7 (mobile). The database enforces
// the same pattern (customers_phone_check).

export const moroccanE164Pattern = /^\+212[5-7]\d{8}$/;

export function normalizeMoroccanPhone(input: string): string | null {
  const digits = input.replace(/[\s().-]/g, "");
  let national: string | null = null;

  if (/^\+212\d{9}$/.test(digits)) {
    national = digits.slice(4);
  } else if (/^00212\d{9}$/.test(digits)) {
    national = digits.slice(5);
  } else if (/^212\d{9}$/.test(digits)) {
    national = digits.slice(3);
  } else if (/^0\d{9}$/.test(digits)) {
    national = digits.slice(1);
  } else if (/^\+2120\d{9}$/.test(digits)) {
    // Common typo: "+212 06…" — the trunk 0 must be dropped.
    national = digits.slice(5);
  }

  if (!national) {
    return null;
  }
  const e164 = `+212${national}`;
  return moroccanE164Pattern.test(e164) ? e164 : null;
}

export function formatMoroccanPhone(e164: string): string {
  if (!moroccanE164Pattern.test(e164)) {
    return e164;
  }
  const national = `0${e164.slice(4)}`;
  return national.replace(/^(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/, "$1 $2 $3 $4 $5");
}
