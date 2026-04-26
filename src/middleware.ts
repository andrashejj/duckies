import { defineMiddleware } from "astro:middleware";

import { getSession, isAdmin, isAuthenticated } from "./lib/session";

const PUBLIC_PREFIXES = [
  "/",
  "/shop",
  "/training-materials",
  "/orders",
  "/login",
  "/api/auth",
  "/api/reserve",
  "/_astro",
  "/_server-islands",
  "/_image",
  "/media",
  "/favicon",
  "/apple-touch-icon",
  "/fonts",
];

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return true;
  }
  if (pathname.startsWith("/shop/")) return true;
  if (pathname.startsWith("/orders/")) return true;
  return false;
}

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;

  const needsAdmin =
    pathname === "/admin" ||
    pathname.startsWith("/admin/") ||
    pathname.startsWith("/api/admin/");
  const needsAuth =
    pathname === "/account" ||
    pathname.startsWith("/account/") ||
    pathname === "/members" ||
    pathname.startsWith("/members/");

  if (!needsAdmin && !needsAuth) {
    // Still populate locals so pages/nav can use session state
    const session = await getSession(context.request);
    context.locals.session = session;
    context.locals.isAdmin = isAdmin(session);
    return next();
  }

  const session = await getSession(context.request);
  context.locals.session = session;
  context.locals.isAdmin = isAdmin(session);

  if (needsAdmin && !isAdmin(session)) {
    if (pathname.startsWith("/api/")) {
      return new Response(
        JSON.stringify({ ok: false, error: "Admin access required." }),
        { status: 403, headers: { "Content-Type": "application/json" } },
      );
    }
    const loginUrl = new URL("/login", context.url);
    loginUrl.searchParams.set("next", pathname);
    loginUrl.searchParams.set("reason", "admin");
    return context.redirect(loginUrl.pathname + loginUrl.search);
  }

  if (needsAuth && !isAuthenticated(session)) {
    const loginUrl = new URL("/login", context.url);
    loginUrl.searchParams.set("next", pathname);
    return context.redirect(loginUrl.pathname + loginUrl.search);
  }

  // Keep quiet on unused parameter
  void isPublicPath;

  return next();
});
