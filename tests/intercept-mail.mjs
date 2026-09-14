// Loaded only by Playwright's server process. Production has no test login or
// code-returning endpoint. Never sends an email to an external service.
import { appendFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

if (process.env.RESEND_API_KEY !== "duckies-test-email-intercepted" || !/^\/duckies_test(?:_[a-z0-9_]+)?$/.test(new URL(process.env.DUCKIES_DATABASE_URL).pathname)) {
  throw new Error("Email interception is restricted to the Duckies test database.");
}
const originalFetch = globalThis.fetch;
globalThis.fetch = async (input, init) => {
  if (String(input) === "https://api.resend.com/emails") {
    const mail = JSON.parse(init.body);
    mkdirSync(dirname(process.env.DUCKIES_TEST_MAIL_FILE), { recursive: true });
    appendFileSync(process.env.DUCKIES_TEST_MAIL_FILE, JSON.stringify(mail) + "\n", { mode: 0o600 });
    return Response.json({ id: "test-email" });
  }
  return originalFetch(input, init);
};
