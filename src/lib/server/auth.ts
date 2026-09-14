import { betterAuth, type BetterAuthOptions } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { emailOTP } from "better-auth/plugins";
import { canSignIn, findMember, getDatabase } from "./db";
import { sendMail } from "./email";

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
        if (ctx.path === "/sign-in/email-otp" && !(await canSignIn(ctx.body?.email ?? ""))) {
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
        // Branding requesters and shop customers can verify their identity.
        // Branding approval and club membership are checked separately.
        if (type !== "sign-in" || !(await canSignIn(email))) return;
        await sendMail({
          to: email,
          subject: "Your Sunset Duckies sign-in code",
          text: `Your Sunset Duckies sign-in code is ${otp}. It expires in 10 minutes. If you didn't request this, you can ignore this email.`,
        });
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
