export async function sendMail(message: { to: string | string[]; subject: string; text: string; html?: string }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) throw new Error("Configure RESEND_API_KEY and EMAIL_FROM.");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ ...message, from, to: Array.isArray(message.to) ? message.to : [message.to] }),
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error("Email delivery is temporarily unavailable.");
  const body = await response.json() as { id?: string };
  if (!body.id) throw new Error("Email delivery was not confirmed.");
  return body.id;
}
