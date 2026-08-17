import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/* ─────────────────────────────────────────────────────────────────
   NEXO Route Protection Middleware
   Two distinct auth contexts:
     USER  → /login  → / (member workspace)
     ADMIN → /admin/login → /admin (console)
───────────────────────────────────────────────────────────────── */

// Public pages — no session required
const USER_LOGIN_PAGE  = "/login";
const ADMIN_LOGIN_PAGE = "/admin/login";

// Public API routes
const PUBLIC_API_PREFIXES = [
  "/api/auth/login",
  "/api/auth/logout",   // logout should always work
  "/api/auth/me",       // used by login pages to check session
  "/api/seed-db",
  "/api/seed-ipos",
  "/api/ipos",
  "/api/applications",
  "/api/admin/allotment",
  "/api/admin/distribution",
  "/api/admin/ipos",
  "/api/admin/dashboard",
  "/api/health",
  "/api/members",
  "/api/transactions",
  "/api/notifications",
  "/api/conversations",
  "/api/presence",
];

// Static asset extensions — always pass through
const STATIC_EXTENSIONS = [".png", ".jpg", ".jpeg", ".svg", ".ico", ".webp", ".woff", ".woff2", ".css", ".js"];

function isStaticAsset(pathname: string): boolean {
  return (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static") ||
    pathname.startsWith("/fonts") ||
    STATIC_EXTENSIONS.some((ext) => pathname.endsWith(ext))
  );
}

function isPublicApi(pathname: string): boolean {
  return PUBLIC_API_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── Always pass static assets ───────────────────────────────
  if (isStaticAsset(pathname)) return NextResponse.next();

  // ── Block /register — admin-provisioned only ────────────────
  if (pathname === "/register") {
    return NextResponse.redirect(new URL(USER_LOGIN_PAGE, request.url));
  }

  // ── Public login pages & root page pass-through ────────────
  if (pathname === USER_LOGIN_PAGE || pathname === ADMIN_LOGIN_PAGE || pathname === "/") {
    return NextResponse.next();
  }

  const sessionCookie   = request.cookies.get("nexo_session");
  const isAuthenticated = Boolean(sessionCookie?.value);

  // ── Public API routes ────────────────────────────────────────
  if (pathname.startsWith("/api/")) {
    if (!isAuthenticated && !isPublicApi(pathname)) {
      return NextResponse.json(
        { success: false, error: "Authentication required." },
        { status: 401 }
      );
    }
    return NextResponse.next();
  }

  // ── Admin routes (/admin, /admin/*) ─────────────────────────
  if (pathname.startsWith("/admin")) {
    if (!isAuthenticated) {
      const loginUrl = new URL(ADMIN_LOGIN_PAGE, request.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  // ── Protected sub-routes ─────────────────────────────────────
  if (!isAuthenticated) {
    const loginUrl = new URL(USER_LOGIN_PAGE, request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
