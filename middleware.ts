import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/* ─────────────────────────────────────────────────────────────────
   NEXO User-Side Route Protection Middleware
   User context:
     /login  → / (member workspace)
───────────────────────────────────────────────────────────────── */

// Public pages — no session required
const USER_LOGIN_PAGE = "/login";

// Public API routes
const PUBLIC_API_PREFIXES = [
  "/api/auth/login",
  "/api/auth/logout",
  "/api/auth/me",
  "/api/ipos",
  "/api/applications",
  "/api/health",
  "/api/members",
  "/api/portfolio",
  "/api/profile",
  "/api/transactions",
  "/api/notifications",
  "/api/avatar",
  "/api/upload",
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

  // ── Block /admin — separate deployment ───────────────────────
  if (pathname.startsWith("/admin")) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // ── Public login page & root page pass-through ─────────────
  if (pathname === USER_LOGIN_PAGE || pathname === "/") {
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
