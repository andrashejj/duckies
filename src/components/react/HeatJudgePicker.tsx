import { useState } from "react";
import type { Heat, HeatVolunteer } from "../../lib/comp";
import type { ParentProfile } from "../../lib/parent-profile";
import { input, mono } from "../../lib/comp-ui";
import { ParentPhoto } from "./ParentProfileEditor";

export default function HeatJudgePicker({ heat, parents, volunteers, disabled, onChange }: {
  heat: Heat; parents: ParentProfile[]; volunteers: HeatVolunteer[];
  disabled: boolean; onChange: (judges: string[]) => void;
}) {
  const [search, setSearch] = useState("");
  const selected = parents.filter(person => heat.judges.includes(person.email));
  const query = search.trim().toLocaleLowerCase();
  const people = parents.filter(person => [person.name, person.email, ...person.children.map(kid => kid.name)].join(" ").toLocaleLowerCase().includes(query));
  return <div className="grid min-w-0 gap-3 border-t border-line pt-3">
    <h4 className={mono}>Judges for this heat · {heat.judges.length}</h4>
    {selected.length ? <ul className="flex flex-wrap gap-2" aria-label="Selected judges">
      {selected.map(person => <li key={person.email} className="flex min-w-0 items-center gap-2 rounded-full border border-line py-1 pl-1 pr-3 text-sm font-bold">
        <ParentPhoto profile={person} className="h-8 w-8" /><span className="break-words">{person.name || person.email}</span>
      </li>)}
    </ul> : <p className="text-sm text-fg-muted">Select a parent or volunteer so they can score this heat.</p>}
    <details className="min-w-0 rounded-xl border border-line p-3">
      <summary className="cursor-pointer font-display font-bold">Choose judges</summary>
      <fieldset disabled={disabled} className="mt-3 grid min-w-0 gap-3">
        <legend className="sr-only">Parents and volunteers</legend>
        <label className="grid min-w-0 gap-1 text-sm">
          Find a parent or volunteer
          <input type="search" className={`${input} w-full min-w-0`} value={search} onChange={event => setSearch(event.target.value)} placeholder="Name or child’s name" />
        </label>
        <div className="grid max-h-64 gap-2 overflow-y-auto overscroll-contain">
          {people.map(person => {
            const checked = heat.judges.includes(person.email);
            const request = volunteers.find(entry => entry.heatId === heat.id && entry.email === person.email);
            return <label key={person.email} className={`flex min-w-0 cursor-pointer items-center gap-3 rounded-lg border p-2 ${checked ? "border-fg bg-surface" : "border-line"}`}>
              <input type="checkbox" aria-label={`Select ${person.name || person.email}`} checked={checked} disabled={!person.name.trim() && !checked}
                onChange={event => onChange(event.target.checked ? [...heat.judges, person.email] : heat.judges.filter(email => email !== person.email))} />
              <ParentPhoto profile={person} className="h-10 w-10" />
              <span className="grid min-w-0 gap-0.5 text-sm">
                <span className="break-words font-bold">{person.name || person.email}</span>
                <span className="break-words text-xs text-fg-muted">{person.children.length ? `Parent of ${person.children.map(kid => kid.name).join(", ")}` : "Club volunteer"}</span>
                {request?.status === "pending" && <span className="text-xs font-bold">Volunteered for this heat</span>}
                {!person.name.trim() && <span className="text-xs">Needs a profile name</span>}
              </span>
            </label>;
          })}
          {!people.length && <p className="py-2 text-sm text-fg-muted">No matching parents or volunteers.</p>}
        </div>
        <p className="text-xs text-fg-muted">Selection gives access to score this heat. No invitation email is sent.</p>
      </fieldset>
    </details>
  </div>;
}
