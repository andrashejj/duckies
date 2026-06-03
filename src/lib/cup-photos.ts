import { site } from "../data/site";

// Loads the list of Cup photo filenames.
//
// The photos live in a Nextcloud public share. At BUILD time we ask Nextcloud
// for the file list (WebDAV PROPFIND on the public-link endpoint, using the
// share token as the HTTP Basic username). This runs wherever `astro build`
// runs — e.g. Vercel's build container, which has outbound internet — so the
// gallery stays in sync with the album with no manual list to maintain.
//
// If the share can't be reached (offline, sandboxed CI, share removed), we fall
// back to `cup.photos.files` from site.ts, so the build never breaks.

const { base, token, files: fallback } = site.cup.photos;

const IMAGE_RE = /\.(jpe?g|png|gif|webp)$/i;

async function listShare(): Promise<string[]> {
  const auth = "Basic " + Buffer.from(`${token}:`).toString("base64");

  // Classic endpoint first, then the newer DAV path as a backup.
  const endpoints = [
    `${base}/public.php/webdav/`,
    `${base}/public.php/dav/files/${token}/`,
  ];

  for (const url of endpoints) {
    try {
      const res = await fetch(url, {
        method: "PROPFIND",
        headers: { Authorization: auth, Depth: "1" },
        signal: AbortSignal.timeout(20000),
      });
      if (!res.ok) continue;

      const xml = await res.text();
      const hrefs = [...xml.matchAll(/<[a-z0-9]*:?href>([^<]+)<\/[a-z0-9]*:?href>/gi)].map(
        (m) => m[1],
      );

      const names = hrefs
        .map((h) => decodeURIComponent(h).replace(/\/+$/, "").split("/").pop() ?? "")
        .filter((name) => IMAGE_RE.test(name));

      const unique = [...new Set(names)].sort((a, b) =>
        a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }),
      );

      if (unique.length) return unique;
    } catch {
      // Try the next endpoint, then fall back.
    }
  }

  return [];
}

export async function loadCupPhotoFiles(): Promise<string[]> {
  const listed = await listShare();
  return listed.length ? listed : [...fallback];
}
