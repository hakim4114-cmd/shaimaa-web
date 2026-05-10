const SIZE_ORDER = ["S", "M", "L", "XL", "XXL"];

const SIZE_LABELS = {
  S: "S",
  M: "M",
  L: "L",
  XL: "XL",
  XXL: "XXL"
};

const defaultCopy = {
  confirmation: "This is only an initial recommendation. We will confirm your size before dispatch.",
  messages: {
    missing: "Enter your height and weight, or your quarter chest measurement, to receive a simple size suggestion.",
    quarterConfirm: "A quarter chest measurement of {quarter} needs direct confirmation before choosing a djellaba size.",
    quarterNote: "Based on your quarter chest measurement of {quarter}, {size} is the strongest size match.",
    relaxedFit: " We sized up because you prefer a relaxed traditional fit.",
    unavailable: " This size is not listed for the piece, so the team should confirm availability before dispatch.",
    usualSize: "your usual {usualSize} size",
    relaxedReason: "your relaxed fit preference",
    fittedReason: "your fitted fit preference",
    bodyNote: "Based on {height} cm and {weight} kg{detail}, {size} should give the most balanced djellaba fit.",
    withReasons: " with {reasons}",
    reasonJoiner: " and "
  }
};

function formatMessage(template, values) {
  return Object.entries(values).reduce((message, [key, value]) => {
    return message.replaceAll(`{${key}}`, value);
  }, template);
}

function getAdvisorCopy(copy) {
  return {
    ...defaultCopy,
    ...copy,
    messages: {
      ...defaultCopy.messages,
      ...(copy?.messages || {})
    }
  };
}

function clampIndex(index) {
  return Math.min(Math.max(index, 0), SIZE_ORDER.length - 1);
}

function getHeightSizeIndex(heightCm) {
  if (heightCm < 158) {
    return 0;
  }

  if (heightCm < 166) {
    return 1;
  }

  if (heightCm < 174) {
    return 2;
  }

  return 3;
}

function getWeightSizeIndex(weightKg) {
  if (weightKg < 55) {
    return 0;
  }

  if (weightKg < 68) {
    return 1;
  }

  if (weightKg < 82) {
    return 2;
  }

  return 3;
}

function getQuarterChestSizeIndex(quarterChest) {
  if (quarterChest <= 27) {
    return 0;
  }

  if (quarterChest <= 29) {
    return 1;
  }

  if (quarterChest <= 31) {
    return 2;
  }

  if (quarterChest <= 33) {
    return 3;
  }

  return 4;
}

function isNearBoundary(value, boundaries, margin) {
  return boundaries.some((boundary) => Math.abs(value - boundary) <= margin);
}

function getAvailabilityNote(size, availableSizes, messages) {
  if (!Array.isArray(availableSizes) || availableSizes.length === 0 || availableSizes.includes(size)) {
    return "";
  }

  return messages.unavailable;
}

function addRelaxedFit(sizeIndex) {
  return clampIndex(sizeIndex + 1);
}

function getQuarterChestAdvice({ quarterChest, fitPreference, availableSizes, copy }) {
  const quarter = Number(quarterChest);
  const advisorCopy = getAdvisorCopy(copy);
  const messages = advisorCopy.messages;

  if (quarter >= 36) {
    return {
      recommendedSize: "Confirm",
      confidence: "needs confirmation",
      note: formatMessage(messages.quarterConfirm, { quarter }),
      confirmationMessage: advisorCopy.confirmation
    };
  }

  let recommendedIndex = getQuarterChestSizeIndex(quarter);
  const nearBoundary = quarter >= 35 || isNearBoundary(quarter, [28, 30, 32, 34], 0.5);

  if (fitPreference === "relaxed" && recommendedIndex < SIZE_ORDER.length - 1) {
    recommendedIndex = addRelaxedFit(recommendedIndex);
  }

  const recommendedSize = SIZE_ORDER[recommendedIndex];
  let confidence = "high";

  if (nearBoundary && (quarter >= 35 || recommendedSize === "XXL")) {
    confidence = "needs confirmation";
  } else if (nearBoundary || fitPreference === "relaxed") {
    confidence = "medium";
  }

  const fitNote = fitPreference === "relaxed" ? messages.relaxedFit : "";
  const availabilityNote = getAvailabilityNote(recommendedSize, availableSizes, messages);

  return {
    recommendedSize,
    confidence,
    note: `${formatMessage(messages.quarterNote, {
      quarter,
      size: SIZE_LABELS[recommendedSize]
    })}${fitNote}${availabilityNote}`,
    confirmationMessage: advisorCopy.confirmation
  };
}

export function getSizeAdvice({ heightCm, weightKg, quarterChest, fitPreference, usualSize, availableSizes, copy }) {
  const quarter = Number(quarterChest);
  const height = Number(heightCm);
  const weight = Number(weightKg);
  const advisorCopy = getAdvisorCopy(copy);
  const messages = advisorCopy.messages;

  if (quarter) {
    return getQuarterChestAdvice({ quarterChest: quarter, fitPreference, availableSizes, copy: advisorCopy });
  }

  if (!height || !weight) {
    return {
      recommendedSize: null,
      confidence: "needs confirmation",
      note: messages.missing,
      confirmationMessage: advisorCopy.confirmation
    };
  }

  const heightIndex = getHeightSizeIndex(height);
  const weightIndex = getWeightSizeIndex(weight);
  const usualSizeIndex = SIZE_ORDER.indexOf(usualSize);
  let recommendedIndex = Math.max(heightIndex, weightIndex);
  const reasons = [];

  if (usualSizeIndex >= 0 && Math.abs(usualSizeIndex - recommendedIndex) <= 1) {
    recommendedIndex = Math.max(recommendedIndex, usualSizeIndex);
    reasons.push(formatMessage(messages.usualSize, { usualSize }));
  }

  if (fitPreference === "relaxed") {
    recommendedIndex = addRelaxedFit(recommendedIndex);
    reasons.push(messages.relaxedReason);
  }

  if (fitPreference === "fitted") {
    reasons.push(messages.fittedReason);
  }

  const recommendedSize = SIZE_ORDER[recommendedIndex];
  const nearBoundary = isNearBoundary(height, [158, 166, 174], 2) || isNearBoundary(weight, [55, 68, 82], 2);
  const mixedSignals = Math.abs(heightIndex - weightIndex) >= 2;
  const usualSizeDiffers = usualSizeIndex >= 0 && Math.abs(usualSizeIndex - recommendedIndex) >= 2;
  const unavailableSize = Boolean(getAvailabilityNote(recommendedSize, availableSizes, messages));

  let confidence = "high";

  if (nearBoundary || mixedSignals || usualSizeDiffers || unavailableSize) {
    confidence = "needs confirmation";
  } else if (usualSize === "unknown" || fitPreference === "relaxed" || Math.abs(heightIndex - weightIndex) === 1) {
    confidence = "medium";
  }

  const detail =
    reasons.length > 0
      ? formatMessage(messages.withReasons, { reasons: reasons.join(messages.reasonJoiner) })
      : "";
  const availabilityNote = getAvailabilityNote(recommendedSize, availableSizes, messages);

  return {
    recommendedSize,
    confidence,
    note: `${formatMessage(messages.bodyNote, {
      height,
      weight,
      detail,
      size: SIZE_LABELS[recommendedSize]
    })}${availabilityNote}`,
    confirmationMessage: advisorCopy.confirmation
  };
}

export const sizeAdvisorOptions = {
  fitPreferences: [
    { value: "fitted", label: "Fitted" },
    { value: "regular", label: "Regular" },
    { value: "relaxed", label: "Relaxed" }
  ],
  usualSizes: [
    { value: "S", label: "S" },
    { value: "M", label: "M" },
    { value: "L", label: "L" },
    { value: "XL", label: "XL" },
    { value: "XXL", label: "XXL" },
    { value: "unknown", label: "I do not know" }
  ]
};
