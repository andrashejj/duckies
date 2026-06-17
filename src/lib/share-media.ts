// Build-time helpers for media that lives in Nextcloud public shares
// (owncloud.justnet.pl).
//
// At BUILD time we ask Nextcloud for the file list (WebDAV PROPFIND on the
// public-link endpoint, using the share token as the HTTP Basic username).
// This runs wherever `astro build` runs — e.g. Vercel's build container,
// which has outbound internet — so galleries stay in sync with the album
// with no manual list to maintain.
//
// If the share can't be reached (offline, sandboxed CI, share removed), we
// fall back to the hardcoded `files` list, so the build never breaks. To
// regenerate a fallback list by hand, run
// `bash scripts/list-share-media.sh <token>` on a network that can reach
// the host and paste its output.

export interface ShareConfig {
  base: string;
  token: string;
  files: readonly string[];
}

export const IMAGE_RE = /\.(jpe?g|png|gif|webp)$/i;
export const VIDEO_RE = /\.(mp4|mov|m4v|webm)$/i;
export const MEDIA_RE = /\.(jpe?g|png|gif|webp|mp4|mov|m4v|webm)$/i;

export const isVideo = (name: string) => VIDEO_RE.test(name);

// Server-side-resized preview for one image in a public share.
// `a=true` keeps the aspect ratio; bump `size` for lightboxes.
export const sharePreviewUrl = (share: ShareConfig, file: string, size: number) =>
  `${share.base}/index.php/apps/files_sharing/publicpreview/${share.token}` +
  `?file=/${encodeURIComponent(file)}&x=${size}&y=${size}&a=true`;

// Direct download/stream URL for one file — what <video> tags want.
export const shareDownloadUrl = (share: ShareConfig, file: string) =>
  `${share.base}/index.php/s/${share.token}/download?path=%2F&files=${encodeURIComponent(file)}`;

async function listShare(share: ShareConfig, matcher: RegExp): Promise<string[]> {
  const auth = "Basic " + Buffer.from(`${share.token}:`).toString("base64");

  // Classic endpoint first, then the newer DAV path as a backup.
  const endpoints = [
    `${share.base}/public.php/webdav/`,
    `${share.base}/public.php/dav/files/${share.token}/`,
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
        .filter((name) => matcher.test(name));

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

export async function loadShareFiles(
  share: ShareConfig,
  matcher: RegExp = MEDIA_RE,
): Promise<string[]> {
  const listed = await listShare(share, matcher);
  return listed.length ? listed : share.files.filter((name) => matcher.test(name));
}
