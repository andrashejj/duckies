import type { APIRoute } from 'astro';
import { z } from 'zod';
import { getSession } from '../../lib/session';
import { GalleryError } from '../../lib/server/gallery';
import { json, sameOrigin } from '../../lib/server/http';
import { socialBody } from '../../lib/server/social-http';
import { createPublicShare, revokePublicShare, sharePreview, validSource } from '../../lib/server/public-shares';
export const prerender = false;
const source = z.string().max(200).refine(validSource);
const handler: APIRoute = async ({ request, url }) => {
  try {
    const session = await getSession(request);
    if (!session) throw new GalleryError('Please sign in.', 401);
    const owner = { id: session.user.id, email: session.user.email };
    if (request.method === 'GET') {
      const key = source.safeParse(url.searchParams.get('source'));
      if (!key.success) throw new GalleryError('Invalid moment.');
      return json(await sharePreview(owner, key.data));
    }
    if (!sameOrigin(request)) throw new GalleryError('Invalid request origin.', 403);
    const body = await socialBody(request);
    if (request.method === 'POST') {
      const parsed = z.object({ sourceKey: source, caption: z.string().max(2000), publicConsent: z.literal(true) }).strict().safeParse(body);
      if (!parsed.success) throw new GalleryError('Check your caption and confirm permission to share publicly.');
      return json(await createPublicShare(owner, parsed.data.sourceKey, parsed.data.caption), 201);
    }
    const parsed = z.object({ sourceKey: source }).strict().safeParse(body);
    if (!parsed.success) throw new GalleryError('Invalid moment.');
    await revokePublicShare(owner, parsed.data.sourceKey);
    return json({ ok: true });
  } catch (error) {
    if (error instanceof GalleryError) return json({ error: error.message }, error.status);
    console.error('Public sharing request failed.', error);
    return json({ error: 'Could not load or save this public link. Please try again.' }, 503);
  }
};
export const GET = handler;
export const POST = handler;
export const DELETE = handler;
