import { defineConfig } from "@playwright/test";
import { resolve } from "node:path";
import { generateKeyPairSync } from "node:crypto";

const databaseURL = process.env.TEST_DATABASE_URL;
if (!databaseURL || !/^\/duckies_test(?:_[a-z0-9_]+)?$/.test(new URL(databaseURL).pathname)) {
  throw new Error("Set TEST_DATABASE_URL to a dedicated Postgres database named duckies_test (or duckies_test_<suffix>). Tests reset its contents.");
}
process.env.DUCKIES_DATABASE_URL = databaseURL;
process.env.WAIVER_SIGNING_PRIVATE_KEY = generateKeyPairSync("ed25519").privateKey.export({ format: "der", type: "pkcs8" }).toString("base64");
process.env.BETTER_AUTH_URL = "http://127.0.0.1:4329";
process.env.BETTER_AUTH_SECRET = "duckies-local-tests-only-not-a-production-secret";
process.env.RESEND_API_KEY = "duckies-test-email-intercepted";
process.env.EMAIL_FROM = "Duckies Tests <test@example.com>";
process.env.EMAIL_ADMIN_NOTIFY = "organiser@example.com";
process.env.DUCKIES_TEST_MAIL_FILE = resolve("test-results/mail.jsonl");

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  workers: 1,
  timeout: 60000,
  globalSetup: "./tests/setup.ts",
  use: { baseURL: process.env.BETTER_AUTH_URL, trace: "retain-on-failure" },
  webServer: {
    command: "pnpm exec astro dev --host 127.0.0.1 --port 4329",
    url: "http://127.0.0.1:4329/login",
    reuseExistingServer: false,
    env: { NODE_ENV: "development", DUCKIES_TEST_SERVER: "1", NODE_OPTIONS: `${process.env.NODE_OPTIONS ?? ""} --import=${resolve("tests/intercept-mail.mjs")}` },
    timeout: 120000,
  },
});
