# Google Sheets Order Saving With Apps Script

This project should not use the Google Sheets API directly.

Instead, the frontend sends the COD order to a Google Apps Script Web App URL.

## 1. Google Sheet Columns

Create a Google Sheet with a tab named:

```text
Orders
```

Use these columns in row 1:

```text
Created At
Order ID
Full Name
Phone Number
City
Full Address
Product Slug
Product Name
Price
Color
Size
Quantity
Notes
Payment Method
Order Status
Source
```

## 2. Recommended Combined Google Apps Script Code

This is the recommended MVP script. It supports both:

1. COD order saving.
2. Order tracking when `data.action === "trackOrder"`.

Tracking requests are handled before the order append logic, so a tracking lookup never creates a new row.

In your Google Sheet:

1. Go to `Extensions`.
2. Open `Apps Script`.
3. Paste this code.
4. Deploy as a Web App.
5. Set access to `Anyone`.
6. Copy the Web App URL.

```js
const SHEET_NAME = "Orders";
const INVALID_ORDER_RESPONSE = {
  success: false,
  message: "Invalid order details"
};

const HEADERS = [
  "Created At",
  "Order ID",
  "Full Name",
  "Phone Number",
  "City",
  "Full Address",
  "Product Slug",
  "Product Name",
  "Price",
  "Color",
  "Size",
  "Quantity",
  "Notes",
  "Payment Method",
  "Order Status",
  "Source"
];

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    const data = JSON.parse(e.postData.contents || "{}");
    const sheet = getOrdersSheet_();

    if (data.action === "trackOrder") {
      return trackOrder_(sheet, data);
    }

    const order = normalizeOrder_(data);
    const validation = validateOrder_(order);

    if (!validation.isValid) {
      return jsonResponse_(INVALID_ORDER_RESPONSE);
    }

    const orderId = createOrderId_();

    sheet.appendRow([
      order.createdAt,
      orderId,
      order.fullName,
      order.phoneNumber,
      order.city,
      order.fullAddress,
      order.productSlug,
      order.productName,
      order.price,
      order.color,
      order.size,
      order.quantity,
      order.notes,
      order.paymentMethod,
      order.orderStatus,
      order.source
    ]);

    return jsonResponse_({
      success: true,
      orderId: orderId
    });
  } catch (error) {
    return jsonResponse_({
      success: false,
      message: "Order could not be saved"
    });
  } finally {
    lock.releaseLock();
  }
}

function normalizeOrder_(data) {
  return {
    createdAt: cleanText_(data.createdAt) || new Date().toISOString(),
    fullName: cleanText_(data.fullName),
    phoneNumber: normalizeMoroccanPhone_(data.phoneNumber),
    city: cleanText_(data.city),
    fullAddress: cleanText_(data.fullAddress),
    productSlug: cleanText_(data.productSlug),
    productName: cleanText_(data.productName),
    price: cleanText_(data.price),
    color: cleanText_(data.color),
    size: cleanText_(data.size),
    quantity: Number(data.quantity),
    notes: cleanText_(data.notes),
    paymentMethod: cleanText_(data.paymentMethod) || "Cash on Delivery",
    orderStatus: cleanText_(data.orderStatus) || "New",
    source: cleanText_(data.source) || "website"
  };
}

function validateOrder_(order) {
  if (!isValidCustomerName_(order.fullName)) {
    return { isValid: false };
  }

  if (!isValidMoroccanMobile_(order.phoneNumber)) {
    return { isValid: false };
  }

  if (!isValidCity_(order.city)) {
    return { isValid: false };
  }

  if (!isValidAddress_(order.fullAddress)) {
    return { isValid: false };
  }

  if (!order.productSlug || !order.productName || !order.price || !order.color || !order.size) {
    return { isValid: false };
  }

  if (!Number.isInteger(order.quantity) || order.quantity < 1 || order.quantity > 3) {
    return { isValid: false };
  }

  return { isValid: true };
}

function cleanText_(value) {
  return String(value || "").trim();
}

function compactText_(value) {
  return cleanText_(value).toLowerCase().replace(/[\s'\u2019-]/g, "");
}

function isBlockedText_(value) {
  const blockedValues = [
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
  ];

  return blockedValues.indexOf(compactText_(value)) >= 0;
}

function hasLetters_(value) {
  return /[A-Za-z\u00C0-\u024F\u0600-\u06FF]/.test(cleanText_(value));
}

function isNumbersOnly_(value) {
  return /^\d+$/.test(cleanText_(value).replace(/\s/g, ""));
}

function isSymbolsOnly_(value) {
  const text = cleanText_(value);
  return text.length > 0 && !/[A-Za-z\u00C0-\u024F\u0600-\u06FF0-9]/.test(text);
}

function isRepeatedCharacters_(value, minimumLength) {
  const minimum = minimumLength || 4;
  const compacted = cleanText_(value).toLowerCase().replace(/[\s'\u2019.,#/-]/g, "");

  if (compacted.length < minimum) {
    return false;
  }

  return new Set(compacted.split("")).size === 1;
}

function isValidCustomerName_(name) {
  const cleanedName = cleanText_(name);

  if (cleanedName.length < 3) {
    return false;
  }

  if (isNumbersOnly_(cleanedName) || isSymbolsOnly_(cleanedName) || isRepeatedCharacters_(cleanedName)) {
    return false;
  }

  if (isBlockedText_(cleanedName) || !hasLetters_(cleanedName)) {
    return false;
  }

  return /^[A-Za-z\u00C0-\u024F\u0600-\u06FF\s'\u2019-]+$/.test(cleanedName);
}

function normalizeMoroccanPhone_(phoneNumber) {
  const digitsOnly = cleanText_(phoneNumber).replace(/\D/g, "");

  if (/^0[67]\d{8}$/.test(digitsOnly)) {
    return digitsOnly;
  }

  if (/^212[67]\d{8}$/.test(digitsOnly)) {
    return "0" + digitsOnly.slice(3);
  }

  if (/^00212[67]\d{8}$/.test(digitsOnly)) {
    return "0" + digitsOnly.slice(5);
  }

  return digitsOnly;
}

function isValidMoroccanMobile_(phoneNumber) {
  const normalizedPhone = normalizeMoroccanPhone_(phoneNumber);

  if (!/^0[67]\d{8}$/.test(normalizedPhone)) {
    return false;
  }

  const subscriberDigits = normalizedPhone.slice(2);
  const repeatedSubscriberDigits = new Set(subscriberDigits.split("")).size === 1;

  return !repeatedSubscriberDigits;
}

function isValidCity_(city) {
  const cleanedCity = cleanText_(city);
  return cleanedCity.length >= 2 && !isSymbolsOnly_(cleanedCity);
}

function isValidAddress_(address) {
  const cleanedAddress = cleanText_(address);

  if (cleanedAddress.length < 8) {
    return false;
  }

  if (isNumbersOnly_(cleanedAddress) || isRepeatedCharacters_(cleanedAddress) || isBlockedText_(cleanedAddress)) {
    return false;
  }

  return true;
}

function trackOrder_(sheet, data) {
  const orderId = String(data.orderId || "").trim().toUpperCase();
  const phoneNumber = normalizeMoroccanPhone_(data.phoneNumber);
  const values = sheet.getDataRange().getValues();
  const headers = values[0] || [];

  const orderIdIndex = headers.indexOf("Order ID");
  const phoneIndex = headers.indexOf("Phone Number");
  const orderStatusIndex = headers.indexOf("Order Status");
  const deliveryStatusIndex = headers.indexOf("Delivery Status");
  const updatedAtIndex = headers.indexOf("Tracking Updated At");

  if (orderIdIndex < 0 || phoneIndex < 0 || orderStatusIndex < 0) {
    return jsonResponse_({
      found: false,
      message: "ORDER_NOT_FOUND"
    });
  }

  for (let rowIndex = 1; rowIndex < values.length; rowIndex += 1) {
    const row = values[rowIndex];
    const rowOrderId = String(row[orderIdIndex] || "").trim().toUpperCase();
    const rowPhone = normalizeMoroccanPhone_(row[phoneIndex]);

    if (rowOrderId === orderId && rowPhone === phoneNumber) {
      return jsonResponse_({
        found: true,
        orderStatus: row[orderStatusIndex] || "New",
        deliveryStatus: deliveryStatusIndex >= 0 ? row[deliveryStatusIndex] || "" : "",
        lastUpdated: updatedAtIndex >= 0 ? row[updatedAtIndex] || "" : "",
        message: ""
      });
    }
  }

  return jsonResponse_({
    found: false,
    message: "ORDER_NOT_FOUND"
  });
}

function getOrdersSheet_() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(SHEET_NAME);
  }

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
  }

  return sheet;
}

function createOrderId_() {
  const timeZone = Session.getScriptTimeZone();
  const stamp = Utilities.formatDate(new Date(), timeZone, "yyyyMMdd-HHmmss");
  return `MS-${stamp}`;
}

function jsonResponse_(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
```

## 3. Frontend Environment Variable

Create a local environment file named:

```text
.env.local
```

Add your deployed Apps Script Web App URL:

```text
NEXT_PUBLIC_GOOGLE_SCRIPT_URL="https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec"
```

If you deploy the combined script above, the same `/exec` URL can also be used as `GOOGLE_TRACKING_SCRIPT_URL`.

```text
NEXT_PUBLIC_GOOGLE_SCRIPT_URL="https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec"
GOOGLE_TRACKING_SCRIPT_URL="https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec"
```

Only `NEXT_PUBLIC_GOOGLE_SCRIPT_URL` is public because the current COD form posts to Apps Script from the browser. `GOOGLE_TRACKING_SCRIPT_URL` must stay server-only.

This project does not currently use `NEXT_PUBLIC_ORDER_FORM_TOKEN`. If you add it later, make sure the line has no trailing quote, for example:

```text
NEXT_PUBLIC_ORDER_FORM_TOKEN=your-token-here
```

Restart the Next.js dev server after changing `.env.local`.

## 4. Current Frontend Behavior

The COD form sends:

- Full name
- Phone number
- City
- Full address
- Product
- Color
- Size
- Quantity
- Notes
- Product price
- Payment method
- Order status
- Source

The frontend trims text values before sending them, normalizes the Moroccan phone number by removing spaces and dashes,
and sends `quantity` as a number.

The Apps Script response should be valid JSON:

```json
{
  "success": true,
  "orderId": "MS-20260509-120000"
}
```

If your script returns `order_id` instead of `orderId`, the frontend also accepts it and stores it before redirecting.

After a successful Apps Script response, the customer is redirected to:

```text
/thank-you
```

If submission fails, the form shows an error message.

## 5. Order Tracking MVP

The website now includes a `/track-order` page. Customers enter:

- Order ID
- Phone number

The browser must call only the internal Next.js route:

```text
/api/track-order
```

Do not expose the tracking Apps Script URL with a `NEXT_PUBLIC_` variable.

Add this private server-side environment variable:

```text
GOOGLE_TRACKING_SCRIPT_URL="https://script.google.com/macros/s/YOUR_TRACKING_DEPLOYMENT_ID/exec"
```

The Next.js API route sends this payload to Apps Script:

```json
{
  "action": "trackOrder",
  "orderId": "MS-20260509-120000",
  "phoneNumber": "06XXXXXXXX"
}
```

Apps Script must only return safe public fields:

```json
{
  "found": true,
  "orderStatus": "Confirmed",
  "deliveryStatus": "Preparing",
  "lastUpdated": "2026-05-10T12:00:00.000Z",
  "message": ""
}
```

If the Order ID and phone number do not match the same row, return a generic not-found response:

```json
{
  "found": false,
  "message": "ORDER_NOT_FOUND"
}
```

Never return private customer data from tracking:

- Full name
- Address
- Notes
- Full row data
- Internal sheet IDs
- Apps Script internals

Manual MVP statuses:

- New
- Confirmed
- Preparing
- Dispatched
- Out for delivery
- Delivered
- Could not reach customer
- Cancelled
- Returned

### Tracking Apps Script Pattern

The full Apps Script above already checks `data.action === "trackOrder"` before creating a new order:

```js
function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    const data = JSON.parse(e.postData.contents || "{}");
    const sheet = getOrdersSheet_();

    if (data.action === "trackOrder") {
      return trackOrder_(sheet, data);
    }

    const orderId = createOrderId_();

    // Existing order append logic stays here.
  } catch (error) {
    return jsonResponse_({
      success: false,
      message: "Order could not be saved"
    });
  } finally {
    lock.releaseLock();
  }
}
```

The tracking helper matches both Order ID and normalized phone:

```js
function trackOrder_(sheet, data) {
  const orderId = String(data.orderId || "").trim().toUpperCase();
  const phoneNumber = normalizeMoroccanPhone_(data.phoneNumber);
  const values = sheet.getDataRange().getValues();
  const headers = values[0] || [];

  const orderIdIndex = headers.indexOf("Order ID");
  const phoneIndex = headers.indexOf("Phone Number");
  const orderStatusIndex = headers.indexOf("Order Status");
  const deliveryStatusIndex = headers.indexOf("Delivery Status");
  const updatedAtIndex = headers.indexOf("Tracking Updated At");

  if (orderIdIndex < 0 || phoneIndex < 0 || orderStatusIndex < 0) {
    return jsonResponse_({
      found: false,
      message: "ORDER_NOT_FOUND"
    });
  }

  for (let rowIndex = 1; rowIndex < values.length; rowIndex += 1) {
    const row = values[rowIndex];
    const rowOrderId = String(row[orderIdIndex] || "").trim().toUpperCase();
    const rowPhone = normalizeMoroccanPhone_(row[phoneIndex]);

    if (rowOrderId === orderId && rowPhone === phoneNumber) {
      return jsonResponse_({
        found: true,
        orderStatus: row[orderStatusIndex] || "New",
        deliveryStatus: deliveryStatusIndex >= 0 ? row[deliveryStatusIndex] || "" : "",
        lastUpdated: updatedAtIndex >= 0 ? row[updatedAtIndex] || "" : "",
        message: ""
      });
    }
  }

  return jsonResponse_({
    found: false,
    message: "ORDER_NOT_FOUND"
  });
}
```

Use the same `normalizeMoroccanPhone_(phoneNumber)` helper from the order submission script.

### Tracking Web App Deployment

For the MVP, `GOOGLE_TRACKING_SCRIPT_URL` can use the same Apps Script Web App URL as `NEXT_PUBLIC_GOOGLE_SCRIPT_URL` if the full combined script above is deployed. That combined script checks:

```js
if (data.action === "trackOrder") {
  return trackOrder_(sheet, data);
}
```

before it appends a new order.

If you are still using an older basic order-only script, do not point `GOOGLE_TRACKING_SCRIPT_URL` at it. Leave `GOOGLE_TRACKING_SCRIPT_URL` empty until tracking is ready, or deploy a separate tracking script and use that `/exec` URL.

The safer long-term option is a separate tracking-only Apps Script deployment that only supports `action: "trackOrder"`. Use that separate URL for `GOOGLE_TRACKING_SCRIPT_URL` when you want cleaner operational separation.

Deploy either option as a Web App:

1. Open the Google Sheet.
2. Go to `Extensions` -> `Apps Script`.
3. Paste the combined script above, or a tracking-only script with the same helpers.
4. Click `Deploy` -> `New deployment`.
5. Select `Web app`.
6. Set `Execute as` to `Me`.
7. Set `Who has access` to `Anyone`.
8. Click `Deploy`.
9. Copy the Web App URL ending in `/exec`.
10. Put that URL in the project root `.env.local` as `GOOGLE_TRACKING_SCRIPT_URL`.
11. Restart `npm run dev` or redeploy production after changing environment variables.

Optional future-safe headers for manual delivery tracking:

```text
Delivery Status
Tracking Updated At
Delivery Provider
Delivery Tracking ID
```

These are optional for the MVP. The existing `Order Status` column is enough to show a basic status.

## 6. Admin Orders Read-Only Endpoint

The admin orders page reads real orders through this secure server-side chain:

```text
/admin/orders
→ /api/admin/orders
→ GOOGLE_ADMIN_ORDERS_SCRIPT_URL
→ Google Sheets
```

Important:

- Do not expose the admin orders Apps Script URL in the browser.
- Do not prefix it with `NEXT_PUBLIC_`.
- Do not reuse the public `NEXT_PUBLIC_GOOGLE_SCRIPT_URL` for admin reads.
- Use a separate Apps Script deployment URL for the read-only admin endpoint.
- The Next.js admin API already requires the signed admin session before calling this URL.

Add this private environment variable:

```text
GOOGLE_ADMIN_ORDERS_SCRIPT_URL="https://script.google.com/macros/s/YOUR_ADMIN_ORDERS_DEPLOYMENT_ID/exec"
```

Use this Apps Script code for the separate admin orders read-only deployment:

```js
const SHEET_NAME = "Orders";

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents || "{}");

    if (data.action !== "adminListOrders") {
      return jsonResponse_({
        success: false,
        message: "Unsupported action"
      });
    }

    const sheet = getOrdersSheet_();
    const orders = listAdminOrders_(sheet);

    return jsonResponse_({
      success: true,
      orders: orders
    });
  } catch (error) {
    return jsonResponse_({
      success: false,
      message: "Orders could not be loaded"
    });
  }
}

function listAdminOrders_(sheet) {
  const values = sheet.getDataRange().getValues();

  if (values.length < 2) {
    return [];
  }

  const headers = values[0];
  const orders = [];

  for (let rowIndex = 1; rowIndex < values.length; rowIndex += 1) {
    const row = values[rowIndex];

    orders.push({
      orderId: getCell_(headers, row, "Order ID"),
      createdAt: getCell_(headers, row, "Created At"),
      fullName: getCell_(headers, row, "Full Name"),
      phoneNumber: getCell_(headers, row, "Phone Number"),
      city: getCell_(headers, row, "City"),
      productName: getCell_(headers, row, "Product Name"),
      color: getCell_(headers, row, "Color"),
      size: getCell_(headers, row, "Size"),
      quantity: getCell_(headers, row, "Quantity"),
      notes: getCell_(headers, row, "Notes"),
      orderStatus: getCell_(headers, row, "Order Status") || "New",
      deliveryStatus: getCell_(headers, row, "Delivery Status"),
      riskStatus: getRiskStatus_(getCell_(headers, row, "Notes")),
      lastUpdated: getCell_(headers, row, "Tracking Updated At")
    });
  }

  return orders.reverse();
}

function getCell_(headers, row, headerName) {
  const index = headers.indexOf(headerName);

  if (index < 0) {
    return "";
  }

  const value = row[index];

  if (value instanceof Date) {
    return value.toISOString();
  }

  return String(value || "").trim();
}

function getRiskStatus_(notes) {
  const text = String(notes || "");

  if (text.indexOf("INTERNAL COD RISK NOTE") >= 0) {
    return "Internal risk note present";
  }

  return "";
}

function getOrdersSheet_() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = spreadsheet.getSheetByName(SHEET_NAME);

  if (!sheet) {
    throw new Error("Orders sheet not found");
  }

  return sheet;
}

function jsonResponse_(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
```

This admin endpoint intentionally does not return:

- Full address
- Sheet ID
- Spreadsheet ID
- Row numbers
- Apps Script internals
- Apps Script URL
