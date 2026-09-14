export function getAdminNotifyAddress(): string | undefined {
  return process.env.EMAIL_ADMIN_NOTIFY;
}

export function getSiteUrl(): string {
  if (!process.env.BETTER_AUTH_URL) throw new Error("BETTER_AUTH_URL is required.");
  return new URL(process.env.BETTER_AUTH_URL).origin;
}
