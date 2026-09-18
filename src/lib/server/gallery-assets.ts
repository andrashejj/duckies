import { stat, open } from "node:fs/promises";
import { join } from "node:path";
import { Readable } from "node:stream";

// The curated gallery (src/assets/gallery, bundled into the server function
// like the PDF font) is served through /gallery/asset/<path>, which the
// middleware keeps behind the member login. Files are read relative to the
// working directory, which is the project root both in `astro dev` and inside
// the Vercel function.

const ROOT = "src/assets/gallery";
const ASSET_PATH = /^(clips\/)?[a-z0-9-]+\.(webp|mp4)$/;
const TYPES: Record<string, string> = { webp: "image/webp", mp4: "video/mp4" };

export async function serveGalleryAsset(path: string, rangeHeader: string | null): Promise<Response> {
  if (!ASSET_PATH.test(path)) return new Response("Not found", { status: 404 });
  const file = join(ROOT, path);
  let size: number;
  try { size = (await stat(file)).size; } catch { return new Response("Not found", { status: 404 }); }
  const type = TYPES[path.slice(path.lastIndexOf(".") + 1)];
  const headers: Record<string, string> = { "Content-Type": type, "Accept-Ranges": "bytes", "X-Content-Type-Options": "nosniff" };

  // <video> playback (Safari in particular) needs byte ranges; a single range is enough.
  const range = rangeHeader?.match(/^bytes=(\d*)-(\d*)$/);
  let start = 0, end = size - 1, status = 200;
  if (range && (range[1] || range[2])) {
    start = range[1] ? Number(range[1]) : Math.max(0, size - Number(range[2]));
    end = range[1] && range[2] ? Math.min(Number(range[2]), size - 1) : end;
    if (start > end || start >= size) return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
    status = 206;
    headers["Content-Range"] = `bytes ${start}-${end}/${size}`;
  }
  headers["Content-Length"] = String(end - start + 1);

  const handle = await open(file, "r");
  const stream = handle.createReadStream({ start, end }); // closes the handle when done
  return new Response(Readable.toWeb(stream) as ReadableStream, { status, headers });
}
