export async function submitOrderToGoogleSheets({ scriptUrl, orderData }) {
  if (!scriptUrl) {
    throw new Error("MISSING_SCRIPT_URL");
  }

  let response;

  try {
    response = await fetch(scriptUrl, {
      method: "POST",
      body: JSON.stringify(orderData)
    });
  } catch {
    throw new Error("NETWORK_ERROR");
  }

  if (!response.ok) {
    throw new Error("REQUEST_FAILED");
  }

  let result;

  try {
    const responseText = await response.text();
    result = responseText ? JSON.parse(responseText) : null;
  } catch {
    throw new Error("INVALID_RESPONSE");
  }

  if (!result || result.success !== true) {
    throw new Error(result?.message || "SCRIPT_REJECTED_ORDER");
  }

  return result;
}
