import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { adminSessionCookieName, verifyAdminSessionValue } from "@/lib/adminSession";
import { buildAdminProductRecord, sanitizeAdminProduct, validateAdminProductInput } from "@/lib/adminProducts";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

async function hasValidAdminSession() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(adminSessionCookieName)?.value;

  return verifyAdminSessionValue(sessionCookie, process.env.ADMIN_SESSION_SECRET || "");
}

function unauthorizedResponse() {
  return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
}

function unconfiguredResponse() {
  return NextResponse.json({ success: false, message: "PRODUCTS_SERVICE_UNAVAILABLE" }, { status: 503 });
}

export async function PATCH(request, { params }) {
  if (!(await hasValidAdminSession())) {
    return unauthorizedResponse();
  }

  const supabaseAdmin = getSupabaseAdminClient();

  if (!supabaseAdmin) {
    return unconfiguredResponse();
  }

  const { id } = await params;
  let body;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, message: "INVALID_REQUEST" }, { status: 400 });
  }

  const validation = validateAdminProductInput(body);

  if (!validation.isValid) {
    return NextResponse.json({ success: false, message: "VALIDATION_FAILED", errors: validation.errors }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("products")
    .update(buildAdminProductRecord(body))
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 502 });
  }

  return NextResponse.json({ success: true, product: sanitizeAdminProduct(data) });
}

export async function DELETE(request, { params }) {
  if (!(await hasValidAdminSession())) {
    return unauthorizedResponse();
  }

  const supabaseAdmin = getSupabaseAdminClient();

  if (!supabaseAdmin) {
    return unconfiguredResponse();
  }

  const { id } = await params;
  const { error } = await supabaseAdmin.from("products").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 502 });
  }

  return NextResponse.json({ success: true });
}
