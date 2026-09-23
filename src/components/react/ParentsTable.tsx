import { useCallback, useEffect, useState } from "react";
import type { ParentAccess, ParentProfile } from "../../lib/parent-profile";
import { accessLabel, accessPill, boardTable, errorNotice, input, mono, panel, pill, select } from "../../lib/comp-ui";
import { ParentPhoto, ParentPhotoUpload } from "./ParentProfileEditor";

// Who the directory is showing: everyone, only the adults the club has
// approved for membership, or the ones still waiting on that tick.
const scopes = {
  all: { label: "All adults", empty: "No adults on file yet.", match: () => true },
  approved: { label: "Approved club members", empty: "Nobody is approved for club membership yet. Approve a guardian from their duckie's card.", match: (a: ParentAccess) => a === "member" || a === "organiser" },
  family: { label: "Family access only", empty: "Every linked guardian is approved for club membership.", match: (a: ParentAccess) => a === "family" },
} as const;
type Scope = keyof typeof scopes;

export default function ParentsTable({ initialParents }: { initialParents: ParentProfile[] }) {
  const [parents, setParents] = useState(initialParents);
  const [ready, setReady] = useState(false);
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<Scope>("all");
  const [error, setError] = useState("");
  const refresh = useCallback(async (signal?: AbortSignal) => {
    try {
      const response = await fetch("/api/admin/parents", { cache: "no-store", signal });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Couldn't refresh the parent list.");
      setParents(data.parents); setError("");
    } catch (e) {
      if (!signal?.aborted) setError(e instanceof Error ? e.message : "Couldn't refresh the parent list.");
    }
  }, []);
  useEffect(() => {
    setReady(true);
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      await refresh(controller.signal);
      if (!controller.signal.aborted) timer = setTimeout(() => void poll(), 5000);
    }
    void poll();
    return () => { controller.abort(); clearTimeout(timer); };
  }, [refresh]);
  const search = query.trim().toLowerCase();
  const visible = parents.filter(parent => scopes[scope].match(parent.access)
    && [parent.name, parent.email, parent.phone, ...parent.children.map(kid => `${kid.name} ${kid.relationship ?? ""}`)].join(" ").toLowerCase().includes(search));
  const approved = parents.filter(parent => scopes.approved.match(parent.access)).length;
  return <section className={`${panel} min-w-0`} aria-label="Parent directory">
    <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
      <label className="grid w-full max-w-md gap-2"><span className={mono}>Find a parent or duckie</span><input type="search" disabled={!ready} className={input} value={query} onChange={event => setQuery(event.target.value)} placeholder="Name, email, phone or duckie" /></label>
      <label className="grid gap-2"><span className={mono}>Show</span><select disabled={!ready} className={select} value={scope} onChange={event => setScope(event.target.value as Scope)}>{Object.entries(scopes).map(([key, { label }]) => <option key={key} value={key}>{label}</option>)}</select></label>
      <p className={mono}>{visible.length} of {parents.length} adults · {approved} approved</p>
    </div>
    {error && <p role="status" className={`${errorNotice} mb-4`}>{error} Showing the last loaded list.</p>}
    <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Parent details table">
      <table className={`${boardTable} min-w-[820px]`}>
        <caption className="sr-only">Parent profiles, club access and guardian relationships</caption>
        <thead><tr><th scope="col">Photo</th><th scope="col">Parent / guardian</th><th scope="col">Club access</th><th scope="col">Contact</th><th scope="col">Duckies</th></tr></thead>
        <tbody>{visible.map(parent => <tr key={parent.email}>
          <td><div className="flex w-32 flex-col items-start gap-2"><ParentPhoto profile={parent} /><ParentPhotoUpload profile={parent} onSaved={() => void refresh()} /></div></td>
          <td className="font-display font-bold">{parent.name || "Name not added"}</td>
          <td><div className="grid justify-items-start gap-1.5"><span className={`${pill} ${accessPill[parent.access]}`}>{accessLabel[parent.access]}</span>{!parent.signedIn && <span className="text-xs text-fg-muted">Not signed in yet</span>}</div></td>
          <td><div className="grid gap-1"><a className="break-all underline underline-offset-4" href={`mailto:${parent.email}`}>{parent.email}</a>{parent.phone ? <a href={`tel:${parent.phone.replace(/[^+\d]/g, "")}`}>{parent.phone}</a> : <span className="text-fg-muted">No phone added</span>}</div></td>
          <td>{parent.children.length ? <ul className="space-y-2">{parent.children.map(kid => <li key={kid.id}><a className="font-semibold underline underline-offset-4" href={`/admin/kids/${kid.id}/guardians`}>{kid.name}</a>{kid.relationship && <span className="block text-xs text-fg-muted">{kid.relationship}</span>}</li>)}</ul> : <span className="text-fg-muted">No registered duckies</span>}</td>
        </tr>)}</tbody>
      </table>
    </div>
    {!visible.length && <p className="py-8 text-center text-fg-muted">{!parents.length ? "Parents will appear when a registration is signed." : search ? "No parents match your search." : scopes[scope].empty}</p>}
  </section>;
}
