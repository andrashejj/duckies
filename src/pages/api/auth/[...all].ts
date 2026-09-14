import type { APIRoute } from "astro";
import { getAuth } from "../../../lib/server/auth";
import { json } from "../../../lib/server/http";

export const prerender = false;
export const ALL: APIRoute = async ({ request, clientAddress }) => {
  try {
    const headers = new Headers(request.headers);
    // Use the adapter's client IP, not an arbitrary forwarded header.
    headers.set("x-forwarded-for", clientAddress);
    return await getAuth().handler(new Request(request, { headers }));
  } catch {
    console.error("Duckies authentication request failed. Check database and email configuration.");
    return json({ error: "Sign-in is temporarily unavailable. Please try again shortly." }, 503);
  }
};
