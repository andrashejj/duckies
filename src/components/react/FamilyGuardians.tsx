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
  async function resend(guardian: FamilyGuardian) {
    setBusy(true); setMessage("");
    try {
      const result = await change("PATCH", { kidIds: [guardian.kidId], email: guardian.email });
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
  return <section aria-label="Family guardians" className="mt-8 rounded-2xl border-2 border-edge bg-surface p-5 sm:p-7">
    <div className="flex flex-wrap items-end justify-between gap-3"><div><p className={mono}>Your family</p><h2 className="mt-2 font-display text-2xl font-bold">Parents & legal guardians</h2></div><a className="font-bold underline underline-offset-4" href="/account/orders">Family order history →</a></div>
    <p className="mt-3 max-w-2xl text-sm leading-6 text-fg-muted">Each guardian signs in with their own email. They can see and update these duckies, open their signed records and share the family’s order history. Guardians of a club member’s family can also place orders.</p>
    <div className="mt-5 grid gap-4">{kids.map(kid => <div key={kid.id} className="rounded-xl border border-line p-4">
      <h3 className="font-display text-lg font-bold">{kid.name}</h3>
      <ul className="mt-3 divide-y divide-line">{guardians.filter(g => g.kidId===kid.id).map(g => <li key={g.email} className="flex flex-wrap items-center justify-between gap-3 py-3">
        <div className="flex min-w-0 items-center gap-3">{g.photoVersion && <img className="h-11 w-11 shrink-0 rounded-full object-cover" src={`/api/parents/photo?email=${encodeURIComponent(g.email)}&v=${encodeURIComponent(g.photoVersion)}`} alt={`${g.name}'s profile`} />}
          <div className="min-w-0"><p className="font-semibold">{g.name} <span className="font-normal text-fg-muted">· {g.relationship}{g.email===actorEmail ? " · You" : ""}</span></p><p className="break-all text-sm">{g.email}</p><p className="text-sm text-fg-muted">{g.phone}</p></div></div>
        {g.email!==actorEmail && <div className="flex flex-wrap gap-2"><button type="button" disabled={!ready||busy} className={smallButton} onClick={() => void resend(g)}>Resend invitation<span className="sr-only"> to {g.name} for {kid.name}</span></button><button type="button" disabled={!ready||busy} className={smallButton} onClick={() => setRemoving(g)}>Remove access<span className="sr-only"> for {g.name} to {kid.name}</span></button></div>}
      </li>)}</ul>
      {!guardians.some(g=>g.kidId===kid.id) && <p className="mt-2 text-sm">No guardians linked yet.</p>}
    </div>)}</div>
    {removing && <div className="mt-4 rounded-xl border-2 border-edge bg-sticker-sun p-4" role="group" aria-label="Confirm removal">
      <p>Remove {removing.name}’s access to {kids.find(k=>k.id===removing.kidId)?.name}? They lose access to orders shared through this duckie unless another linked duckie also grants access. Signed records remain unchanged.</p>
      <div className="mt-3 flex flex-wrap gap-3"><button type="button" className={smallButton} disabled={busy} onClick={()=>void remove()}>Confirm removal</button><button type="button" className={smallButton} disabled={busy} onClick={()=>setRemoving(null)}>Keep access</button></div>
    </div>}
    <div className="mt-6"><button type="button" className="cursor-pointer font-display text-lg font-bold" disabled={!ready||busy} aria-expanded={adding} onClick={() => setAdding(open => !open)}>Add a legal guardian</button>
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
