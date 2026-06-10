import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { adminSessionCookieName, verifyAdminSessionValue } from "@/lib/adminSession";
import { buildAdminProductRecord, sanitizeAdminProduct, validateAdminProductInput } from "@/lib/adminProducts";
import { getSupabaseAdminClient, getSupabaseAdminConfigError } from "@/lib/supabaseAdmin";

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
  return NextResponse.json(
    { success: false, message: "PRODUCTS_SERVICE_UNAVAILABLE", configError: getSupabaseAdminConfigError() },
    { status: 503 }
  );
}

export async function GET() {
  if (!(await hasValidAdminSession())) {
    return unauthorizedResponse();
  }

  const supabaseAdmin = getSupabaseAdminClient();

  if (!supabaseAdmin) {
    return unconfiguredResponse();
  }

  const { data, error } = await supabaseAdmin
    .from("products")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 502 });
  }

  return NextResponse.json({
    success: true,
    products: Array.isArray(data) ? data.map(sanitizeAdminProduct) : []
  });
}

export async function POST(request) {
  if (!(await hasValidAdminSession())) {
    return unauthorizedResponse();
  }

  const supabaseAdmin = getSupabaseAdminClient();

  if (!supabaseAdmin) {
    return unconfiguredResponse();
  }

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
    .insert(buildAdminProductRecord(body))
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 502 });
  }

  return NextResponse.json({ success: true, product: sanitizeAdminProduct(data) });
}
