// Helpers for the Sendit mock (e2e/sendit-mock.mjs).
export const senditMockUrl = `http://127.0.0.1:${process.env.SENDIT_MOCK_PORT ?? 4010}`;
export const mockKeys = { publicKey: "pk_e2e_mock_public", secretKey: "sk_e2e_mock_secret" };

export type MockParcel = { code: string; status: string; payload: Record<string, unknown> };

export async function mockParcels(): Promise<MockParcel[]> {
  const response = await fetch(`${senditMockUrl}/__control/deliveries`);
  return ((await response.json()) as { data: MockParcel[] }).data;
}

/** What the mock answers when the app reads this parcel from the API. */
export async function setMockStatus(code: string, status: string) {
  const response = await fetch(`${senditMockUrl}/__control/deliveries/${encodeURIComponent(code)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status })
  });
  if (!response.ok) throw new Error(`Mock parcel ${code} not found`);
}
