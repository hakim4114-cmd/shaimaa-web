import { adminClient, organizationId, userClient } from "./db";
import { assertLocalStack, finance, otherOwner, owner, type TestUser } from "./env";

// Creates the test accounts and their organizations on the throwaway local stack.
export default async function globalSetup() {
  assertLocalStack();
  const admin = adminClient();

  async function ensureUser(user: TestUser): Promise<string> {
    const { data, error } = await admin.auth.admin.createUser({ email: user.email, password: user.password, email_confirm: true });
    if (!error && data.user) return data.user.id;
    if (error && !/already/i.test(error.message)) throw error;
    const { data: list, error: listError } = await admin.auth.admin.listUsers();
    if (listError) throw listError;
    const found = list.users.find((u) => u.email === user.email);
    if (!found) throw new Error(`User ${user.email} not found`);
    return found.id;
  }

  async function ensureOrganization(user: TestUser, name: string, slug: string) {
    const { data } = await admin.from("organizations").select("id").eq("slug", slug).maybeSingle();
    if (data) return;
    const client = await userClient(user);
    const { error } = await client.rpc("create_organization", { p_name: name, p_slug: slug });
    if (error) throw error;
  }

  await ensureUser(owner);
  await ensureOrganization(owner, owner.org, owner.slug);
  await ensureUser(otherOwner);
  await ensureOrganization(otherOwner, otherOwner.org, otherOwner.slug);

  // A finance member of the main shop, added directly (invitations are not under test here).
  const financeId = await ensureUser(finance);
  const orgId = await organizationId(owner.slug);
  const { error } = await admin.from("organization_members").upsert({ organization_id: orgId, user_id: financeId, role: "finance" }, { onConflict: "organization_id,user_id" });
  if (error) throw error;
}
