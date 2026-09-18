import type { APIRoute } from "astro";
import { serveGalleryAsset } from "../../../lib/server/gallery-assets";
export const prerender = false;

// Curated gallery photos and clips. The middleware has already required a
// signed-in club member for anything under /gallery/.
export const GET: APIRoute = ({ params, request }) => serveGalleryAsset(params.path ?? "", request.headers.get("range"));
