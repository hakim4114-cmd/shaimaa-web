const blockedTextValues = new Set([
  "test",
  "testing",
  "asdf",
  "qwerty",
  "abc",
  "xxx",
  "xxxx",
  "aaa",
  "aaaa",
  "hhhh",
  "zzzz",
  "fake",
  "none",
  "null"
]);

const sequenceLikePhoneNumbers = new Set(["0612345678", "0712345678"]);

export function cleanText(value) {
  return String(value || "").trim();
}

function compactText(value) {
  return cleanText(value).toLowerCase().replace(/[\s'\u2019-]/g, "");
}

function hasLetters(value) {
  return /\p{L}/u.test(value);
}

function isNumbersOnly(value) {
  return /^\d+$/.test(cleanText(value).replace(/\s/g, ""));
}

function isSymbolsOnly(value) {
  const text = cleanText(value);
  return text.length > 0 && !/[\p{L}\d]/u.test(text);
}

function isRepeatedCharacters(value, minimumLength = 4) {
  const compacted = cleanText(value).toLowerCase().replace(/[\s'\u2019.,#/-]/g, "");

  return compacted.length >= minimumLength && new Set([...compacted]).size === 1;
}

function hasAllowedNameCharacters(value) {
  return /^[\p{L}\p{M}\s'\u2019-]+$/u.test(cleanText(value));
}

export function normalizeMoroccanPhone(phone) {
  const digits = cleanText(phone).replace(/[^\d+]/g, "");
  const digitsOnly = digits.replace(/\D/g, "");

  if (/^0[67]\d{8}$/.test(digitsOnly)) {
    return digitsOnly;
  }

  if (/^212[67]\d{8}$/.test(digitsOnly)) {
    return `0${digitsOnly.slice(3)}`;
  }

  if (/^00212[67]\d{8}$/.test(digitsOnly)) {
    return `0${digitsOnly.slice(5)}`;
  }

  return digitsOnly;
}

export function validateMoroccanPhone(phone) {
  const normalizedPhone = normalizeMoroccanPhone(phone);

  if (!/^0[67]\d{8}$/.test(normalizedPhone)) {
    return {
      isValid: false,
      normalizedPhone,
      errorCode: "phoneNumber"
    };
  }

  const repeatedSubscriberDigits = new Set([...normalizedPhone.slice(2)]).size === 1;

  if (new Set([...normalizedPhone]).size === 1 || repeatedSubscriberDigits) {
    return {
      isValid: false,
      normalizedPhone,
      errorCode: "phoneSuspicious"
    };
  }

  return {
    isValid: true,
    normalizedPhone,
    errorCode: ""
  };
}

export function validateCustomerName(name) {
  const cleanedName = cleanText(name);
  const compactedName = compactText(cleanedName);

  if (cleanedName.length < 3) {
    return { isValid: false, errorCode: "fullName" };
  }

  if (
    isNumbersOnly(cleanedName) ||
    isSymbolsOnly(cleanedName) ||
    isRepeatedCharacters(cleanedName) ||
    blockedTextValues.has(compactedName) ||
    !hasLetters(cleanedName) ||
    !hasAllowedNameCharacters(cleanedName)
  ) {
    return { isValid: false, errorCode: "fullNameSuspicious" };
  }

  return { isValid: true, errorCode: "" };
}

export function validateCity(city) {
  const cleanedCity = cleanText(city);

  if (cleanedCity.length < 2 || isSymbolsOnly(cleanedCity)) {
    return { isValid: false, errorCode: "city" };
  }

  return { isValid: true, errorCode: "" };
}

export function validateAddress(address) {
  const cleanedAddress = cleanText(address);
  const compactedAddress = compactText(cleanedAddress);

  if (cleanedAddress.length < 8) {
    return { isValid: false, errorCode: "fullAddress" };
  }

  if (
    isNumbersOnly(cleanedAddress) ||
    isRepeatedCharacters(cleanedAddress) ||
    blockedTextValues.has(compactedAddress)
  ) {
    return { isValid: false, errorCode: "fullAddressSuspicious" };
  }

  return { isValid: true, errorCode: "" };
}

function createFieldError(field, code) {
  return { field, code };
}

export function scoreSuspiciousOrder(order) {
  const reasons = [];
  const normalizedPhone = normalizeMoroccanPhone(order.phoneNumber);

  if (cleanText(order.fullName).split(/\s+/).length === 1) {
    reasons.push("single-name");
  }

  if (sequenceLikePhoneNumbers.has(normalizedPhone)) {
    reasons.push("sequence-like-phone");
  }

  if (cleanText(order.fullAddress).length >= 8 && cleanText(order.fullAddress).length < 12) {
    reasons.push("short-address");
  }

  if (cleanText(order.city).length === 2) {
    reasons.push("short-city");
  }

  return {
    score: reasons.length,
    reasons
  };
}

export function validateCODOrder(order, selectedProduct) {
  const errors = [];
  const nameValidation = validateCustomerName(order.fullName);
  const phoneValidation = validateMoroccanPhone(order.phoneNumber);
  const cityValidation = validateCity(order.city);
  const addressValidation = validateAddress(order.fullAddress);

  if (!nameValidation.isValid) {
    errors.push(createFieldError("fullName", nameValidation.errorCode));
  }

  if (!phoneValidation.isValid) {
    errors.push(createFieldError("phoneNumber", phoneValidation.errorCode));
  }

  if (!cityValidation.isValid) {
    errors.push(createFieldError("city", cityValidation.errorCode));
  }

  if (!addressValidation.isValid) {
    errors.push(createFieldError("fullAddress", addressValidation.errorCode));
  }

  if (!selectedProduct || !selectedProduct.slug || order.productSlug !== selectedProduct.slug) {
    errors.push(createFieldError("product", "product"));
  }

  if (!order.color || !selectedProduct?.colors?.includes(order.color)) {
    errors.push(createFieldError("color", "color"));
  }

  if (!order.size || !selectedProduct?.sizes?.includes(order.size)) {
    errors.push(createFieldError("size", "size"));
  }

  if (!Number.isInteger(order.quantity) || order.quantity < 1) {
    errors.push(createFieldError("quantity", "quantity"));
  }

  if (Number.isInteger(order.quantity) && order.quantity > 3) {
    errors.push(createFieldError("quantity", "quantityTooHigh"));
  }

  return {
    isValid: errors.length === 0,
    errors,
    suspicious: scoreSuspiciousOrder(order)
  };
}
