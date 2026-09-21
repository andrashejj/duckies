import type { APIRoute } from "astro";
import { getAuth, getMemberSession } from "../server/auth";
import { getDatabase } from "../server/db";
import { json, sameOrigin } from "../server/http";
import { RegistrationError, sha256 } from "./records";
export const safeRoute =
  (handler: APIRoute): APIRoute =>
  async (context) => {
    try {
      return await handler(context);
    } catch (error) {
      if (error instanceof RegistrationError)
        return json({ error: error.message }, error.status);
      console.error("Club registration service failed.");
      return json(
        {
          error:
            "The registration service is temporarily unavailable. Please try again.",
        },
        503,
      );
    }
  };
export async function requireOrganiser(request: Request, mutation = false) {
  const member = await getMemberSession(request.headers);
  if (!member) throw new RegistrationError("Please sign in.", 401);
  if (member.role !== "organiser")
    throw new RegistrationError("Organiser access required.", 403);
  if (mutation && !sameOrigin(request))
    throw new RegistrationError("Invalid request origin.", 403);
  return member;
}
// Any verified sign-in (a guardian's email). Club approval is not required:
// what a guardian may see is scoped to their own kids by email.
export async function requireSignedIn(request: Request, mutation = false) {
  const session = await getAuth().api.getSession({ headers: request.headers });
  if (!session?.user.emailVerified)
    throw new RegistrationError("Please sign in.", 401);
  if (mutation && !sameOrigin(request))
    throw new RegistrationError("Invalid request origin.", 403);
  return { email: session.user.email.trim().toLowerCase(), name: session.user.name, userId: session.user.id };
}
export async function readBody(request: Request) {
  const reader = request.body?.getReader();
  let bytes = 0;
  const chunks: Uint8Array[] = [];
  if (!reader) throw new RegistrationError("A form is required.");
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    bytes += value.length;
    if (bytes > 300000) {
      await reader.cancel();
      throw new RegistrationError("The form is too large.", 413);
    }
    chunks.push(value);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new RegistrationError("Invalid form data.");
  }
}
async function rateLimit(bucket: string, ip: string, max: number, window: string, message: string) {
  const key = sha256(`${bucket}:${process.env.BETTER_AUTH_SECRET}:${ip}`);
  const { rows } = await getDatabase().query(
    `INSERT INTO shop_request_limit (key,count,reset_at) VALUES ($1,1,now()+$2::interval)
    ON CONFLICT (key) DO UPDATE SET count=CASE WHEN shop_request_limit.reset_at<=now() THEN 1 ELSE shop_request_limit.count+1 END,
    reset_at=CASE WHEN shop_request_limit.reset_at<=now() THEN now()+$2::interval ELSE shop_request_limit.reset_at END RETURNING count`,
    [key, window],
  );
  if (rows[0].count > max) throw new RegistrationError(message, 429);
}
export const registrationRateLimit = (ip: string) =>
  rateLimit("registration", ip, 40, "1 minute", "Too many requests. Please wait a minute.");
// Re-issuing a family's registration form revokes the invitation the club has
// open for that duckie, so it gets a small budget of its own.
export const formLinkRateLimit = (ip: string) =>
  rateLimit("family-form", ip, 5, "10 minutes", "That's a few forms in a row. Try again in ten minutes, or message the club on WhatsApp.");
// Anonymous sign-ups create kids and links, so they get a much smaller budget.
export const signupRateLimit = (ip: string) =>
  rateLimit("signup", ip, 8, "10 minutes", "That's a lot of sign-ups from here. Take a breather and try again in ten minutes.");

// Bound invitations per signed-in sender and recipient, including retries.
export const guardianInviteRateLimit = (actor: string, recipient: string) =>
  rateLimit("guardian-invite", `${actor}:${recipient}`, 5, "10 minutes", "Please wait ten minutes before sending another invitation to this guardian.");
