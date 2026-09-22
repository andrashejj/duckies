import { useEffect, useState, type SubmitEvent } from "react";
import type { ParentProfile } from "../../lib/parent-profile";
import { errorNotice, input, mono, primaryButton, smallButton } from "../../lib/comp-ui";

export function ParentPhoto({ profile, className = "h-16 w-16" }: { profile: ParentProfile; className?: string }) {
  return profile.photoVersion ? <img src={`/api/parents/photo?email=${encodeURIComponent(profile.email)}&v=${encodeURIComponent(profile.photoVersion)}`} alt={`${profile.name || "Parent"}'s profile`} className={`${className} shrink-0 rounded-full border-2 border-edge object-cover`} /> : <span className={`${className} grid shrink-0 place-items-center rounded-full border-2 border-edge bg-sticker-sun font-display text-2xl`} aria-hidden="true">{(profile.name || profile.email).slice(0,1).toUpperCase()}</span>;
}

export function ParentPhotoUpload({ profile, onSaved }: { profile: ParentProfile; onSaved: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function upload(file?: File) {
    if (!file) return;
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/parents/photo?email=${encodeURIComponent(profile.email)}`, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Couldn't save the photo.");
      onSaved();
    } catch (e) { setError(e instanceof Error ? e.message : "Couldn't save the photo."); }
    finally { setBusy(false); }
  }
  return <div className="grid gap-2"><label className={`${smallButton} cursor-pointer`}>
    {busy ? "Saving photo…" : profile.photoVersion ? "Change photo" : "Add photo"}
    <input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" aria-label={`Photo for ${profile.name || profile.email}`} disabled={busy || !profile.name} onChange={(event) => { void upload(event.target.files?.[0]); event.target.value=""; }} />
  </label>{error && <p role="status" className={errorNotice}>{error}</p>}</div>;
}

export default function ParentProfileEditor({ profile, onSaved, expanded = false }: { profile: ParentProfile; onSaved: () => void; expanded?: boolean }) {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function save(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault(); const data = new FormData(event.currentTarget);
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/parents/profile", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: data.get("name"), phone: data.get("phone") }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Couldn't save your profile.");
      setMessage("Profile saved."); onSaved();
    } catch (e) { setMessage(e instanceof Error ? e.message : "Couldn't save your profile."); }
    finally { setBusy(false); }
  }
  // The page renders on the server. Prevent native form submission (and lost
  // edits) until React has attached the save and photo handlers.
  const fields = <fieldset disabled={!ready} className="min-w-0">
    <p className="mt-2 text-sm text-fg-muted">Your name and photo appear on your club posts and member profile, and help the organisers recognise you. Your phone number stays private to you and the organisers.</p>
    <div className="mt-4 flex items-center gap-4"><ParentPhoto profile={profile} /><ParentPhotoUpload profile={profile} onSaved={onSaved} /></div>
    <form className="mt-4 grid gap-3" onSubmit={(event) => void save(event)}>
      <label className="grid gap-1"><span className={mono}>Your name</span><input name="name" className={input} required maxLength={120} defaultValue={profile.name} autoComplete="name" /></label>
      <label className="grid gap-1"><span className={mono}>Phone</span><input name="phone" className={input} type="tel" maxLength={40} defaultValue={profile.phone} autoComplete="tel" /></label>
      <p className="break-all text-sm text-fg-muted">{profile.email}{profile.children.length ? ` · Parent of ${profile.children.map((kid) => kid.name).join(", ")}` : ""}</p>
      <button className={primaryButton} disabled={busy} type="submit">{busy ? "Saving…" : "Save profile"}</button>
      {message && <p role="status" className="text-sm">{message}</p>}
    </form>
  </fieldset>;
  return expanded ? <section aria-label="Edit my profile" className="rounded-card border-2 border-edge bg-surface p-6 shadow-sticker-sm">{fields}</section> : <details className="rounded-card border-2 border-edge bg-surface p-4" open={!profile.name || undefined}><summary className="cursor-pointer font-display font-bold">Your parent profile</summary>{fields}</details>;
}
