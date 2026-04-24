import { Resend } from "resend";

let cached: Resend | null = null;

export function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  if (!cached) cached = new Resend(key);
  return cached;
}

export function getEmailSender(): string {
  return (
    process.env.EMAIL_FROM ??
    "Sunset Duckies <orders@sunsetduckies.com>"
  );
}

export function getAdminNotifyAddress(): string {
  return process.env.EMAIL_ADMIN_NOTIFY ?? "orders@sunsetduckies.com";
}

export function getSiteUrl(): string {
  return (
    process.env.PUBLIC_SITE_URL ??
    import.meta.env.PUBLIC_SITE_URL ??
    "https://sunsetduckies.com"
  );
}
