import { NextResponse } from "next/server";
import { adminSessionCookieName, verifyAdminSessionValue } from "@/lib/adminSession";

function isAdminLoginPath(pathname) {
  return pathname === "/admin/login";
}

function isAdminLogoutPath(pathname) {
  return pathname === "/admin/logout";
}

function isAdminApiPath(pathname) {
  return pathname === "/api/admin" || pathname.startsWith("/api/admin/");
}

function redirectToAdminLogin(request) {
  const loginUrl = new URL("/admin/login", request.url);

  if (request.nextUrl.pathname !== "/admin") {
    loginUrl.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);
  }

  return NextResponse.redirect(loginUrl);
}

export async function proxy(request) {
  const pathname = request.nextUrl.pathname;
  const sessionSecret = process.env.ADMIN_SESSION_SECRET || "";
  const sessionCookie = request.cookies.get(adminSessionCookieName)?.value;
  const isAuthenticated = await verifyAdminSessionValue(sessionCookie, sessionSecret);

  if (isAdminApiPath(pathname)) {
    if (!isAuthenticated) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.next();
  }

  if (isAdminLoginPath(pathname)) {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL("/admin", request.url));
    }

    return NextResponse.next();
  }

  if (isAdminLogoutPath(pathname)) {
    return NextResponse.next();
  }

  if (!isAuthenticated) {
    return redirectToAdminLogin(request);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"]
};
