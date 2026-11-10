import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "documind_session";
const PROTECTED = ["/dashboard", "/documents", "/history", "/settings"];
const AUTH_PAGES = ["/login", "/register"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = request.cookies.has(SESSION_COOKIE);

  const isProtected = PROTECTED.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );

  if (isProtected && !hasSession) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (hasSession && (AUTH_PAGES.includes(pathname) || pathname === "/")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/login",
    "/register",
    "/dashboard/:path*",
    "/documents/:path*",
    "/history/:path*",
    "/settings/:path*",
  ],
};
