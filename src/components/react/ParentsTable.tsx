import { useCallback, useEffect, useState } from "react";
import type { ParentProfile } from "../../lib/parent-profile";
import { boardTable, errorNotice, input, mono, panel } from "../../lib/comp-ui";
import { ParentPhoto, ParentPhotoUpload } from "./ParentProfileEditor";

export default function ParentsTable({ initialParents }: { initialParents: ParentProfile[] }) {
  const [parents, setParents] = useState(initialParents);
  const [ready, setReady] = useState(false);
  const [query, setQuery] = useState("");
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
  const visible = parents.filter(parent => [parent.name, parent.email, parent.phone, ...parent.children.map(kid => `${kid.name} ${kid.relationship ?? ""}`)].join(" ").toLowerCase().includes(search));
  return <section className={`${panel} min-w-0`} aria-label="Parent directory">
    <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
      <label className="grid w-full max-w-md gap-2"><span className={mono}>Find a parent or duckie</span><input type="search" disabled={!ready} className={input} value={query} onChange={event => setQuery(event.target.value)} placeholder="Name, email, phone or duckie" /></label>
      <p className={mono}>{visible.length} of {parents.length} adults</p>
    </div>
    {error && <p role="status" className={`${errorNotice} mb-4`}>{error} Showing the last loaded list.</p>}
    <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Parent details table">
      <table className={`${boardTable} min-w-[700px]`}>
        <caption className="sr-only">Parent profiles and guardian relationships</caption>
        <thead><tr><th scope="col">Photo</th><th scope="col">Parent / guardian</th><th scope="col">Contact</th><th scope="col">Duckies</th></tr></thead>
        <tbody>{visible.map(parent => <tr key={parent.email}>
          <td><div className="flex w-32 flex-col items-start gap-2"><ParentPhoto profile={parent} /><ParentPhotoUpload profile={parent} onSaved={() => void refresh()} /></div></td>
          <td className="font-display font-bold">{parent.name || "Name not added"}</td>
          <td><div className="grid gap-1"><a className="break-all underline underline-offset-4" href={`mailto:${parent.email}`}>{parent.email}</a>{parent.phone ? <a href={`tel:${parent.phone.replace(/[^+\d]/g, "")}`}>{parent.phone}</a> : <span className="text-fg-muted">No phone added</span>}</div></td>
          <td>{parent.children.length ? <ul className="space-y-2">{parent.children.map(kid => <li key={kid.id}><span className="font-semibold">{kid.name}</span>{kid.relationship && <span className="block text-xs text-fg-muted">{kid.relationship}</span>}</li>)}</ul> : <span className="text-fg-muted">No registered duckies</span>}</td>
        </tr>)}</tbody>
      </table>
    </div>
    {!visible.length && <p className="py-8 text-center text-fg-muted">{parents.length ? "No parents match your search." : "Parents will appear when a registration is signed."}</p>}
  </section>;
}
