export function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "private, no-store" },
  });
}

export function sameOrigin(request: Request) {
  return request.headers.get("origin") === new URL(process.env.BETTER_AUTH_URL!).origin;
}

export function parseName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const name = value.trim().replace(/\s+/gu, " ");
  return name.length > 0 && name.length <= 80 && !/[\p{Cc}\p{Cf}]/u.test(name) ? name : null;
}
