import { expect, type APIRequestContext, type Locator } from "@playwright/test";
import sharp from "sharp";

// The form posts one signature and the children it covers. Tests still
// describe a registration the way a record reads — one flat object — so this
// splits it into children and signed-once fields the way the form does.
const childKeys = ["childName", "dateOfBirth", "medicalNotes", "sessionsPerWeek", "kidId"];

export function submission(...flat: Record<string, any>[]) {
  const shared: Record<string, any> = {};
  const children = flat.map((child, slot) => {
    const block: Record<string, any> = { slot };
    for (const [key, value] of Object.entries(child))
      // An unknown key stays at the top level, where .strict() still refuses it.
      (childKeys.includes(key) ? block : shared)[key] = value;
    return block;
  });
  return { ...shared, children };
}
export const profilePhoto = () => sharp({ create: { width: 32, height: 32, channels: 3, background: "#e9a366" } }).png().toBuffer();

export async function stageProfilePhoto(request: APIRequestContext, headers: Record<string, string>, slot = 0) {
  const response = await request.put(`/api/registration/photo?slot=${slot}`, {
    headers: { ...headers, "content-type": "image/png" }, data: await profilePhoto(),
  });
  expect(response.status()).toBe(200);
}

export async function chooseProfilePhoto(block: Locator) {
  await block.locator('[data-field="photo"]').setInputFiles({ name: "profile.png", mimeType: "image/png", buffer: await profilePhoto() });
  await expect(block.locator('[data-photo-status]')).toContainText("Photo uploaded.");
}
