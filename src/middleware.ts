import { defineMiddleware } from "astro:middleware";
import { getSession, isAdmin } from "./lib/session";
import { json, sameOrigin } from "./lib/server/http";
import { getBrandingAccess } from "./lib/server/branding";

export const onRequest = defineMiddleware(async (context, next) => {
  const path = context.url.pathname;
  const admin = /^\/(admin|api\/admin)(\/|$)/.test(path);
  const account = /^\/account(\/|$)/.test(path);
  const familyPage = /^\/members\/profile\/?$/.test(path);
  const orderPage = /^\/orders(\/|$)/.test(path);
  const personalPage = /^\/members\/me\/?$/.test(path);
  const social = /^\/api\/social(\/|$)/.test(path);
  const members = /^\/members(\/|$)/.test(path);
  // The photo gallery, its share page, the served uploads and the upload API are for club members only.
  const gallery = /^\/(gallery|api\/gallery)(\/|$)/.test(path);
  // The shop is a members-only drop: the page shows everyone else a teaser, reserving needs a member.
  const shop = /^\/shop(\/|$)/.test(path);
  const reservation = path === "/api/reserve";
  // The miniapp is public; scoring and private photos require a session.
  const judgePage = /^\/cup\/judge\/?$/.test(path);
  const judge = /^\/api\/cup\/(judge|photo)(\/|$)/.test(path);
  const brandingPage=/^\/branding-plan(?:\/|$)/.test(path)||/^\/product-ideas\/?$/.test(path);
  const brandingTemplate=/^\/templates\/brand-[a-z-]+\.html\/?$/.test(path);
  const granolaAPI=/^\/api\/granola(?:\/|$)/.test(path);
  const privateResponse = /^\/s(\/|$)/.test(path)||brandingPage||brandingTemplate||gallery||judge||judgePage||shop||/^\/(api|admin|account|orders|members|register)(\/|$)/.test(path);

  async function handle() {
    if(brandingPage||brandingTemplate||granolaAPI){
      try{context.locals.branding=await getBrandingAccess(context.request);}
      catch{return json({error:"Branding access is temporarily unavailable. Please retry."},503);}
      if(!context.locals.branding.canView){
        if(granolaAPI)return json({error:context.locals.branding.session?"Branding access requires approval.":"Please sign in to access the branding workspace."},context.locals.branding.session?403:401);
        if(brandingTemplate)return context.redirect("/branding-plan");
      }
    }
    if (admin || account || members || reservation || gallery || social || judge || judgePage || shop || orderPage) {
      try {
        context.locals.session = await getSession(context.request);
        context.locals.isAdmin = isAdmin(context.locals.session);
      } catch {
        return json({ error: "This service is temporarily unavailable. Please try again." }, 503);
      }
      if ((admin || account || members || gallery || social || judge) && !context.locals.session) {
        if (path.startsWith("/api/")) return json({ ok: false, error: "Please sign in." }, 401);
        return context.redirect(`/login?next=${encodeURIComponent(path)}`);
      }
      if (reservation && !context.locals.session?.canShop) {
        return json({ ok: false, error: context.locals.session ? "The drop is for club members. Join the club to reserve a bag." : "Please sign in to reserve." }, context.locals.session ? 403 : 401);
      }
      const archived = !context.locals.session?.member && !!context.locals.session?.archivedAt;
      const archivedAsset = archived && /^\/gallery\/(photo|asset)\//.test(path) && ["GET","HEAD"].includes(context.request.method);
      if (social && !context.locals.session?.member) return json({ error: "Sharing is for active club members." },403);
      if (archived && path === "/members") return context.redirect("/members/me");
      if ((admin && !context.locals.isAdmin) || ((members || gallery) && !context.locals.session?.member && !(familyPage && context.locals.session?.family) && !(personalPage && archived) && !archivedAsset)) {
        // Signed in but not a club member: the gallery is a membership perk, so point at how to join.
        if (gallery && !path.startsWith("/api/") && !path.startsWith("/gallery/photo/")) return context.redirect(archived ? "/members/me" : "/#how-to-join");
        return json({ ok: false, error: "You do not have access to this area." }, 403);
      }
      if ((admin || reservation || judge || social) && !["GET", "HEAD", "OPTIONS"].includes(context.request.method) && !sameOrigin(context.request)) {
        return json({ ok: false, error: "Invalid request origin." }, 403);
      }
    }
    return next();
  }

  const response = await handle();
  if (privateResponse) {
    // Every read rechecks access, including images after departure or moderation.
    response.headers.set("Cache-Control", "private, no-store");
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
