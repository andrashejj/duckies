import { site } from "../data/site";
import { IMAGE_RE, loadShareFiles } from "./share-media";

// Loads the list of Cup photo filenames from the Nextcloud public share at
// build time (see share-media.ts for how + the offline fallback behaviour).
export async function loadCupPhotoFiles(): Promise<string[]> {
  return loadShareFiles(site.cup.photos, IMAGE_RE);
}
