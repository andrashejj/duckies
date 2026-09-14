import { defineMiddleware } from "astro:middleware";
import { getSession, isAdmin } from "./lib/session";
import { json, sameOrigin } from "./lib/server/http";

export const onRequest = defineMiddleware(async (context, next) => {
  const path = context.url.pathname;
  const admin = /^\/(admin|api\/admin)(\/|$)/.test(path);
  const account = /^\/account(\/|$)/.test(path);
  const members = /^\/members(\/|$)/.test(path);
  const reservation = path === "/api/reserve";
  const privateResponse = /^\/(api|admin|account|orders|members)(\/|$)/.test(path);

  async function handle() {
    if (admin || account || members || reservation) {
      try {
        context.locals.session = await getSession(context.request);
        context.locals.isAdmin = isAdmin(context.locals.session);
      } catch {
        return json({ error: "This service is temporarily unavailable. Please try again." }, 503);
      }
      if ((admin || account || members) && !context.locals.session) {
        if (path.startsWith("/api/")) return json({ ok: false, error: "Please sign in." }, 401);
        return context.redirect(`/login?next=${encodeURIComponent(path)}`);
      }
      if ((admin && !context.locals.isAdmin) || (members && !context.locals.session?.member)) {
        return json({ ok: false, error: "You do not have access to this area." }, 403);
      }
      if ((admin || reservation) && !["GET", "HEAD", "OPTIONS"].includes(context.request.method) && !sameOrigin(context.request)) {
        return json({ ok: false, error: "Invalid request origin." }, 403);
      }
    }
    return next();
  }

  const response = await handle();
  if (privateResponse) {
    response.headers.set("Cache-Control", "private, no-store");
    response.headers.set("CDN-Cache-Control", "no-store");
    response.headers.set("Vercel-CDN-Cache-Control", "no-store");
    response.headers.set("Vary", "Cookie");
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
    response.headers.set("Referrer-Policy", "no-referrer");
  }
  return response;
});
