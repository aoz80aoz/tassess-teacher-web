import { NextResponse, type NextRequest } from "next/server";

// Signed-out visitors can't open the dashboard; signed-in teachers skip
// the login pages. The cookie name matches SESSION_COOKIE in
// src/server/config.ts (proxy can't import server-only modules).

const SESSION_COOKIE = "tt_session";
const AUTH_PAGES = ["/login", "/register", "/forgot-password"];

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const signedIn = Boolean(request.cookies.get(SESSION_COOKIE)?.value);

  if (pathname.startsWith("/app") && !signedIn) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }
  if (AUTH_PAGES.includes(pathname) && signedIn) {
    return NextResponse.redirect(new URL("/app", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/app/:path*", "/login", "/register", "/forgot-password"],
};
