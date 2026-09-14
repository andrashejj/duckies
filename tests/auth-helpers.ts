import { expect, type APIRequestContext } from "@playwright/test";
import { readFile } from "node:fs/promises";
const origin = "http://127.0.0.1:4329";

export async function codeFor(email: string) {
  const lines = (await readFile(process.env.DUCKIES_TEST_MAIL_FILE!, "utf8")).trim().split("\n");
  const mail = lines.map(line => JSON.parse(line)).findLast(mail => mail.to[0] === email);
  return mail?.text.match(/\b\d{6}\b/)?.[0] as string;
}
export async function sendCode(request: APIRequestContext, email: string) {
  const result = await request.post("/api/auth/email-otp/send-verification-otp", { data: { email, type: "sign-in" }, headers: { origin } });
  expect(result.status()).toBe(200);
  return codeFor(email);
}
export async function signIn(request: APIRequestContext, email: string) {
  const otp = await sendCode(request, email);
  const result = await request.post("/api/auth/sign-in/email-otp", { data: { email, otp }, headers: { origin } });
  expect(result.status()).toBe(200);
  return result;
}
