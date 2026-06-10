import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { adminSessionCookieName, verifyAdminSessionValue } from "@/lib/adminSession";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

const productImagesBucket = "product-images";
const maxImageBytes = 5 * 1024 * 1024;
const allowedImageTypes = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp"
};

async function hasValidAdminSession() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(adminSessionCookieName)?.value;

  return verifyAdminSessionValue(sessionCookie, process.env.ADMIN_SESSION_SECRET || "");
}

export async function POST(request) {
  if (!(await hasValidAdminSession())) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const supabaseAdmin = getSupabaseAdminClient();

  if (!supabaseAdmin) {
    return NextResponse.json({ success: false, message: "UPLOAD_SERVICE_UNAVAILABLE" }, { status: 503 });
  }

  let formData;

  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ success: false, message: "INVALID_REQUEST" }, { status: 400 });
  }

  const file = formData.get("file");

  if (!file || typeof file.arrayBuffer !== "function") {
    return NextResponse.json({ success: false, message: "FILE_MISSING" }, { status: 400 });
  }

  const extension = allowedImageTypes[file.type];

  if (!extension) {
    return NextResponse.json({ success: false, message: "FILE_TYPE_NOT_ALLOWED" }, { status: 400 });
  }

  if (file.size > maxImageBytes) {
    return NextResponse.json({ success: false, message: "FILE_TOO_LARGE" }, { status: 400 });
  }

  const filePath = `${Date.now()}-${crypto.randomUUID()}.${extension}`;
  const fileBuffer = await file.arrayBuffer();

  const { error: uploadError } = await supabaseAdmin.storage
    .from(productImagesBucket)
    .upload(filePath, fileBuffer, { contentType: file.type });

  if (uploadError) {
    return NextResponse.json({ success: false, message: uploadError.message }, { status: 502 });
  }

  const { data } = supabaseAdmin.storage.from(productImagesBucket).getPublicUrl(filePath);

  return NextResponse.json({ success: true, url: data?.publicUrl || "" });
}
