import { useState } from "react";
import type { ParentProfile } from "../../lib/parent-profile";
import ParentProfileEditor from "./ParentProfileEditor";
export default function MyProfile({ initialProfile }: { initialProfile: ParentProfile }) {
  const [profile, setProfile] = useState(initialProfile);
  const [error, setError] = useState("");
  async function refresh() {
    try {
      const response = await fetch("/api/parents/profile", { cache: "no-store" });
      if (!response.ok) throw new Error("Saved, but the profile couldn't refresh. Reload to see your changes.");
      setProfile(await response.json()); setError("");
    } catch (e) { setError(e instanceof Error ? e.message : "Couldn't refresh your profile."); }
  }
  return <><ParentProfileEditor profile={profile} expanded onSaved={() => void refresh()} />{error && <p role="status" className="mt-4">{error}</p>}</>;
}
