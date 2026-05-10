import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { adminSessionCookieName, getClearedAdminCookieOptions } from "@/lib/adminSession";

export async function GET(request) {
  const cookieStore = await cookies();

  cookieStore.set(adminSessionCookieName, "", getClearedAdminCookieOptions());

  return NextResponse.redirect(new URL("/admin/login", request.url));
}
