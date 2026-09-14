import { betterAuth, type BetterAuthOptions } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { emailOTP } from "better-auth/plugins";
import { findMember, getDatabase } from "./db";

export function getAuthOptions() {
  const secret = process.env.BETTER_AUTH_SECRET;
  const baseURL = process.env.BETTER_AUTH_URL;
  if (!secret || secret.length < 32 || !baseURL) {
    throw new Error("Set BETTER_AUTH_URL and a BETTER_AUTH_SECRET of at least 32 characters.");
  }
  return {
    appName: "Sunset Duckies",
    database: getDatabase(),
    secret,
    baseURL,
    trustedOrigins: [new URL(baseURL).origin],
    session: { expiresIn: 60 * 60 * 24 * 7, cookieCache: { enabled: false } },
    advanced: { cookiePrefix: "duckies", ipAddress: { ipAddressHeaders: ["x-forwarded-for"] } },
    rateLimit: { enabled: true, storage: "database", window: 60, max: 60 },
    hooks: {
      before: createAuthMiddleware(async (ctx) => {
        if (ctx.path === "/sign-in/email-otp" && !(await findMember(ctx.body?.email ?? ""))) {
          throw new APIError("UNAUTHORIZED", { message: "Unable to sign in. Check your code or contact the club." });
        }
      }),
    },
    plugins: [emailOTP({
      otpLength: 6,
      expiresIn: 600,
      allowedAttempts: 3,
      storeOTP: "hashed",
      rateLimit: { window: 60, max: 3 },
      async sendVerificationOTP({ email, otp, type }) {
        // Keep the same outward response for unknown emails. Only approved
        // addresses receive a code; membership is checked again at sign-in.
        if (type !== "sign-in" || !(await findMember(email))) return;
        const apiKey = process.env.RESEND_API_KEY;
        const from = process.env.EMAIL_FROM;
        if (!apiKey || !from) throw new Error("Configure RESEND_API_KEY and EMAIL_FROM.");
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from,
            to: [email],
            subject: "Your Sunset Duckies sign-in code",
            text: `Your Sunset Duckies sign-in code is ${otp}. It expires in 10 minutes. If you didn't request this, you can ignore this email.`,
          }),
          signal: AbortSignal.timeout(10000),
        });
        if (!response.ok) throw new Error("The sign-in email could not be sent.");
      },
    })],
  } satisfies BetterAuthOptions;
}

function createAuth() { return betterAuth(getAuthOptions()); }

let auth: ReturnType<typeof createAuth> | undefined;
export function getAuth() { return auth ??= createAuth(); }

export async function getMemberSession(headers: Headers) {
  const session = await getAuth().api.getSession({ headers });
  if (!session || !session.user.emailVerified) return null;
  const member = await findMember(session.user.email);
  return member ? { ...member, userId: session.user.id } : null;
}
