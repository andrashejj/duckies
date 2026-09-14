import { defineMiddleware } from "astro:middleware";

export const onRequest = defineMiddleware(async ({ url }, next) => {
  const response = await next();
  if (url.pathname.startsWith("/api/")) {
    response.headers.set("Cache-Control", "private, no-store");
    response.headers.set("CDN-Cache-Control", "no-store");
    response.headers.set("Vercel-CDN-Cache-Control", "no-store");
    response.headers.set("Vary", "Cookie");
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
  }
  return response;
});
