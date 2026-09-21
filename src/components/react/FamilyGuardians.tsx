import { useState, type SubmitEvent } from "react";
import { useHydrated } from "./useHydrated";
import type { FamilyGuardian } from "../../lib/registration/guardians";
import { input, mono, primaryButton, smallButton } from "../../lib/comp-ui";

export default function FamilyGuardians({ kids, initialGuardians, actorEmail, onChanged }: {
  kids: { id: string; name: string }[]; initialGuardians: FamilyGuardian[]; actorEmail: string; onChanged?: () => void;
}) {
  const [guardians, setGuardians] = useState(initialGuardians);
  const ready = useHydrated();
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState(false);
  const [message, setMessage] = useState("");
  const [removing, setRemoving] = useState<FamilyGuardian | null>(null);
  const parents = Array.from(new Set(guardians.map(guardian => guardian.email))).map(email => {
    const links = guardians.filter(guardian => guardian.email === email);
    return { ...links[0], links };
  });
  const refreshUrl = `/api/family/guardians?${new URLSearchParams(kids.map(kid => ["kidId",kid.id]))}`;
  async function refresh() {
    const response = await fetch(refreshUrl, { cache: "no-store" });
    if (!response.ok) throw new Error("Please reload to see the current guardians.");
    setGuardians((await response.json()).guardians); onChanged?.();
  }
  async function change(method: string, body: unknown) {
    const response = await fetch("/api/family/guardians", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Couldn't update the guardians.");
    await refresh();
    return result;
  }
  async function add(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget; const data = new FormData(form);
    setBusy(true); setMessage("");
    try {
      const result = await change("POST", { kidIds: data.getAll("kidId"), confirm: data.get("confirm") === "on", guardian: {
        name: data.get("name"), email: data.get("email"), phone: data.get("phone"), relationship: data.get("relationship"),
      } });
      form.reset();
      setMessage(result.notification === "sent" ? `Guardian added. Sign-in invitation sent to ${String(data.get("email")).trim()}.`
        : result.notification === "failed" ? "Guardian added, but the invitation email could not be sent. Their family access is saved. Use Resend invitation in their guardian entry to try again."
        : "Guardian details saved. They already have family access; use Resend invitation if they need the sign-in link again.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Couldn't add the guardian."); }
    finally { setBusy(false); }
  }
  async function resend(guardian: FamilyGuardian & { links: FamilyGuardian[] }) {
    setBusy(true); setMessage("");
    try {
      const result = await change("PATCH", { kidIds: guardian.links.map(link => link.kidId), email: guardian.email });
      setMessage(result.notification === "sent" ? `Sign-in invitation sent to ${guardian.email}.` : "The invitation email could not be sent. Family access is still saved. Please try again later.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Couldn't send the invitation."); }
    finally { setBusy(false); }
  }
  async function remove() {
    if (!removing) return;
    setBusy(true); setMessage("");
    try { await change("DELETE", { kidIds: [removing.kidId], email: removing.email }); setRemoving(null); setMessage("Family access removed for this duckie."); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Couldn't remove access."); }
    finally { setBusy(false); }
  }
  return <section aria-label="Family guardians" className="family-parents">
    <div className="family-section-heading"><h2>Parents & legal guardians</h2><a className="family-text-link" href="/account/orders">Family orders →</a></div>
    <p className="family-help">Parents who can manage your duckies’ records.</p>
    <ul className="family-parent-list">{parents.map(parent => <li key={parent.email} className="family-parent" data-family-parent data-guardian={parent.email === actorEmail ? '' : undefined}>
      <div className="family-parent-identity">
        {parent.photoVersion ? <img className="family-avatar" src={`/api/parents/photo?email=${encodeURIComponent(parent.email)}&v=${encodeURIComponent(parent.photoVersion)}`} alt={`${parent.name}'s profile`} /> : <span className="family-avatar" aria-hidden="true">{parent.name.slice(0, 1)}</span>}
        <div className="min-w-0"><h3>{parent.name} {parent.email === actorEmail && <span className="family-you">· You</span>}</h3><span className="club-role" data-kind="parent">Parent</span><p className="family-help">{parent.links.map(link => kids.find(kid => kid.id === link.kidId)?.name).filter(Boolean).join(' · ')}</p></div>
        {parent.email === actorEmail && <a href="/account/profile" className="family-text-link family-edit">Edit my profile</a>}
      </div>
      {parent.email !== actorEmail && <details className="family-access">
        <summary>Manage access<span className="sr-only"> for {parent.name}</span></summary>
        <div className="family-access-body"><p className="break-all">{parent.email}</p><p>{parent.phone}</p>
          <p className="family-help">Can view these duckies’ details, signed records and shared family orders.</p>
          <button type="button" disabled={!ready || busy} className={smallButton} onClick={() => void resend(parent)}>Resend invitation<span className="sr-only"> to {parent.name}</span></button>
          {parent.links.map(link => <div key={link.kidId} className="family-access-child"><span>{kids.find(kid => kid.id === link.kidId)?.name}</span><button type="button" disabled={!ready || busy} className="family-text-link" onClick={() => setRemoving(link)}>Remove access<span className="sr-only"> for {parent.name} to {kids.find(kid => kid.id === link.kidId)?.name}</span></button></div>)}
        </div>
      </details>}
    </li>)}</ul>
    {!parents.length && <p className="family-help">No guardians linked yet.</p>}
    {removing && <div className="mt-4 rounded-xl border-2 border-edge bg-sticker-sun p-4" role="group" aria-label="Confirm removal">
      <p>Remove {removing.name}’s access to {kids.find(k=>k.id===removing.kidId)?.name}? They lose access to orders shared through this duckie unless another linked duckie also grants access. Signed records remain unchanged.</p>
      <div className="mt-3 flex flex-wrap gap-3"><button type="button" className={smallButton} disabled={busy} onClick={()=>void remove()}>Confirm removal</button><button type="button" className={smallButton} disabled={busy} onClick={()=>setRemoving(null)}>Keep access</button></div>
    </div>}
    <div className="mt-6"><button type="button" className="journal-button" disabled={!ready||busy} aria-expanded={adding} onClick={() => setAdding(open => !open)}>Add a legal guardian</button>
      {adding &&
      <form className="mt-4" onSubmit={event=>void add(event)}><fieldset disabled={!ready||busy} className="grid min-w-0 gap-4 sm:grid-cols-2">
        <label className="grid gap-1"><span className={mono}>Guardian name</span><input className={input} name="name" required maxLength={120} autoComplete="off" placeholder="First and last name" /></label>
        <label className="grid gap-1"><span className={mono}>Guardian email</span><input className={input} type="email" name="email" required maxLength={200} autoComplete="off" autoCapitalize="none" spellCheck={false} placeholder="guardian@example.com" aria-describedby="guardian-email-help" /></label>
        <label className="grid gap-1"><span className={mono}>Phone</span><input className={input} type="tel" name="phone" required maxLength={40} placeholder="+230 …" /></label>
        <label className="grid gap-1"><span className={mono}>Relationship</span><input className={input} name="relationship" required maxLength={60} placeholder="Mother, father, legal guardian…" /></label>
        <fieldset className="space-y-2 sm:col-span-2"><legend className={`${mono} mb-2`}>Their duckies</legend>{kids.map(kid=><label key={kid.id} className="flex min-h-10 items-center gap-3"><input type="checkbox" name="kidId" value={kid.id} defaultChecked />{kid.name}</label>)}</fieldset>
        <label className="flex items-start gap-3 text-sm leading-6 sm:col-span-2"><input type="checkbox" name="confirm" required className="mt-1" /><span>I confirm this person is a legal guardian and can access the selected children’s details, signed records and our shared family order history.</span></label>
        <p id="guardian-email-help" className="text-sm text-fg-muted sm:col-span-2">We’ll email the guardian a sign-in invitation to access the selected duckies in My family. Existing signed registrations stay unchanged.</p>
        <button className={`${primaryButton} justify-self-start`} type="submit">{busy ? "Saving…" : "Add guardian"}</button>
      </fieldset></form>}
    </div>
    {message && <p className="mt-4 text-sm" role="status">{message}</p>}
  </section>;
}
