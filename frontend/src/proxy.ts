import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "documind_session";

// Pages that need a login. Every other page (landing, features, about, contact,
// privacy, terms, generator) is open to everyone, logged in or not.
const PROTECTED = [
  "/dashboard",
  "/documents",
  "/recent",
  "/collections",
  "/archive",
  "/trash",
  "/shared",
  "/search",
  "/conversations",
  "/converter",
  "/history",
  "/settings",
  "/profile",
  "/admin",
];
const AUTH_PAGES = ["/login", "/register"];

// This only decides where to send the browser. The real check is always the backend.
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

  if (hasSession && AUTH_PAGES.includes(pathname)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

// Must be written out in full (Next.js reads it without running the code)
export const config = {
  matcher: [
    "/login",
    "/register",
    "/dashboard/:path*",
    "/documents/:path*",
    "/recent/:path*",
    "/collections/:path*",
    "/archive/:path*",
    "/trash/:path*",
    "/shared/:path*",
    "/search/:path*",
    "/conversations/:path*",
    "/converter/:path*",
    "/history/:path*",
    "/settings/:path*",
    "/profile/:path*",
    "/admin/:path*",
  ],
};
