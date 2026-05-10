import {
  cleanText,
  normalizeMoroccanPhone,
  validateCODOrder as validateCODOrderDetails,
  validateMoroccanPhone
} from "./orderValidation";

export { cleanText, normalizeMoroccanPhone };

export function isValidMoroccanPhone(phoneNumber) {
  return validateMoroccanPhone(phoneNumber).isValid;
}

export function buildCODOrderPayload({ formData, selectedProduct, selectedColor, selectedSize }) {
  const quantity = Number(formData.get("quantity"));

  return {
    fullName: cleanText(formData.get("fullName")),
    phoneNumber: normalizeMoroccanPhone(formData.get("phoneNumber")),
    city: cleanText(formData.get("city")),
    fullAddress: cleanText(formData.get("fullAddress")),
    productSlug: selectedProduct.slug,
    productName: cleanText(selectedProduct.name),
    price: cleanText(selectedProduct.price),
    color: cleanText(selectedColor),
    size: cleanText(selectedSize),
    quantity,
    notes: cleanText(formData.get("notes")),
    paymentMethod: "Cash on Delivery",
    orderStatus: "New",
    source: "website"
  };
}

export function validateCODOrder(orderData, selectedProduct) {
  const validation = validateCODOrderDetails(orderData, selectedProduct);

  return validation.errors[0]?.code || "";
}

export function createWhatsAppMessage(productName, size) {
  return `Salam, I want to order ${productName} in size ${size}.`;
}
