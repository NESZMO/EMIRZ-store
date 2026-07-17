import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/session-cookie-name";

// Cheap "is there a session cookie" check for routing only — this runs on
// the Edge runtime, which can't load better-sqlite3 or Node's crypto module,
// so it can't fully verify the cookie's signature. Every API route and
// Server Action re-verifies via getSession() (lib/auth-session.ts) before
// doing anything, so this is UX routing, not the security boundary.
export function proxy(request: NextRequest) {
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);
  const isAuthRoute = request.nextUrl.pathname.startsWith("/login");

  if (!hasSession && !isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (hasSession && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
