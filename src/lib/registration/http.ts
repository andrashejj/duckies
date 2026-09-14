import type { APIRoute } from "astro";
import { getMemberSession } from "../server/auth";
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
export async function registrationRateLimit(ip: string) {
  const key = sha256(`registration:${process.env.BETTER_AUTH_SECRET}:${ip}`);
  const { rows } = await getDatabase().query(
    `INSERT INTO shop_request_limit (key,count,reset_at) VALUES ($1,1,now()+interval '1 minute')
    ON CONFLICT (key) DO UPDATE SET count=CASE WHEN shop_request_limit.reset_at<=now() THEN 1 ELSE shop_request_limit.count+1 END,
    reset_at=CASE WHEN shop_request_limit.reset_at<=now() THEN now()+interval '1 minute' ELSE shop_request_limit.reset_at END RETURNING count`,
    [key],
  );
  if (rows[0].count > 40)
    throw new RegistrationError(
      "Too many requests. Please wait a minute.",
      429,
    );
}
