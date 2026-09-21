import type { APIRoute } from 'astro';
import { readPublicShare } from '../../../lib/server/public-shares';
import { readImage } from '../../../lib/server/gallery';
import { serveGalleryAsset } from '../../../lib/server/gallery-assets';
export const prerender = false;
export const GET: APIRoute = async ({ params }) => {
  try {
    const share = await readPublicShare(params.token ?? '');
    if (!share?.photoKey) return new Response('Not found', { status: 404 });
    if (share.photoKey.startsWith('curated:')) return serveGalleryAsset(`${share.photoKey.slice(8)}.webp`, null);
    const image = await readImage(share.photoKey.slice(7), 'full');
    if (!image || image.status !== 'approved') return new Response('Not found', { status: 404 });
    return new Response(new Uint8Array(image.bytes), { headers: { 'Content-Type': 'image/webp' } });
  } catch { return new Response('Unavailable', { status: 503 }); }
};
