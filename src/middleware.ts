import { defineMiddleware } from "astro:middleware";
import { getSession, isAdmin } from "./lib/session";
import { json, sameOrigin } from "./lib/server/http";
import { getBrandingAccess } from "./lib/server/branding";

export const onRequest = defineMiddleware(async (context, next) => {
  const path = context.url.pathname;
  const admin = /^\/(admin|api\/admin)(\/|$)/.test(path);
  const account = /^\/account(\/|$)/.test(path);
  const members = /^\/members(\/|$)/.test(path);
  // The photo gallery, its share page, the served uploads and the upload API are for club members only.
  const gallery = /^\/(gallery|api\/gallery)(\/|$)/.test(path);
  const reservation = path === "/api/reserve";
  // The judge sheet and its API need a session; whether that email may judge is checked in the route.
  const judge = /^\/(cup\/judge|api\/cup\/(judge|photo))(\/|$)/.test(path);
  const brandingPage=/^\/branding-plan(?:\/|$)/.test(path)||/^\/product-ideas\/?$/.test(path);
  const brandingTemplate=/^\/templates\/brand-[a-z-]+\.html\/?$/.test(path);
  const granolaAPI=/^\/api\/granola(?:\/|$)/.test(path);
  const privateResponse = brandingPage||brandingTemplate||gallery||judge||/^\/(api|admin|account|orders|members|register)(\/|$)/.test(path);

  async function handle() {
    if(brandingPage||brandingTemplate||granolaAPI){
      try{context.locals.branding=await getBrandingAccess(context.request);}
      catch{return json({error:"Branding access is temporarily unavailable. Please retry."},503);}
      if(!context.locals.branding.canView){
        if(granolaAPI)return json({error:context.locals.branding.session?"Branding access requires approval.":"Please sign in to access the branding workspace."},context.locals.branding.session?403:401);
        if(brandingTemplate)return context.redirect("/branding-plan");
      }
    }
    if (admin || account || members || reservation || gallery || judge) {
      try {
        context.locals.session = await getSession(context.request);
        context.locals.isAdmin = isAdmin(context.locals.session);
      } catch {
        return json({ error: "This service is temporarily unavailable. Please try again." }, 503);
      }
      if ((admin || account || members || gallery || judge) && !context.locals.session) {
        if (path.startsWith("/api/")) return json({ ok: false, error: "Please sign in." }, 401);
        return context.redirect(`/login?next=${encodeURIComponent(path)}`);
      }
      if ((admin && !context.locals.isAdmin) || ((members || gallery) && !context.locals.session?.member)) {
        // Signed in but not a club member: the gallery is a membership perk, so point at how to join.
        if (gallery && !path.startsWith("/api/") && !path.startsWith("/gallery/photo/")) return context.redirect("/#how-to-join");
        return json({ ok: false, error: "You do not have access to this area." }, 403);
      }
      if ((admin || reservation || judge) && !["GET", "HEAD", "OPTIONS"].includes(context.request.method) && !sameOrigin(context.request)) {
        return json({ ok: false, error: "Invalid request origin." }, 403);
      }
    }
    return next();
  }

  const response = await handle();
  if (privateResponse) {
    // Served gallery photos may sit in the member's own browser cache, never in a shared one.
    response.headers.set("Cache-Control", /^\/gallery\/(photo|asset)\//.test(path) && (response.ok || response.status === 206) ? "private, max-age=86400" : "private, no-store");
    response.headers.set("CDN-Cache-Control", "no-store");
    response.headers.set("Vercel-CDN-Cache-Control", "no-store");
    response.headers.set("Vary", "Cookie");
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
    response.headers.set("Referrer-Policy", "no-referrer");
    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("X-Frame-Options", "DENY");
    response.headers.set("Content-Security-Policy", "frame-ancestors 'none'");
  }
  return response;
});
