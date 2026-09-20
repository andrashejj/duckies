import { useCallback, useRef, useState } from "react";
import type { FamilyKid, FamilyProfile } from "../../lib/registration/family";
import { CUP_LABEL } from "../../lib/registration/cup";
import { RECOMMENDED_AGE } from "../../lib/registration/policy";
import { cn } from "../../lib/cn";
import { memberForm, textButton } from "../../lib/members-ui";
import {
  editPanel,
  editRow,
  factList,
  logList,
  logRow,
  logWhen,
  noteCopy,
  passBand,
  passBody,
  passCard,
  passChevron,
  passGrid,
  passHead,
  passMeta,
  passName,
  passPhoto,
  passPhotoEmpty,
  passPunch,
  passStub,
  passSummary,
  profileStatus,
  stamp,
  type Standing,
} from "../../lib/profile-ui";
import { Cta } from "./ui";

// The family's own passes. Everything a guardian can change lives here; the
// signed registration itself never is — correcting it means signing the form
// again, which the "Update the signed details" button starts.

const MAX_PHOTO_BYTES = 4 * 1024 * 1024;
// Every date here is a club date, and this island renders on the server and
// again in the browser — pinning the zone keeps the two agreeing.
const day = (value: string | Date) =>
  new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Indian/Mauritius" });
// A date of birth is a calendar day, not a moment: read it back as written.
const birthday = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

type Tone = { standing: Standing; label: string; note: string };
function standingOf(kid: FamilyKid, termLabel: string): Tone {
  if (!kid.waiver) return { standing: "alert", label: "Not registered", note: "The registration and waiver still need signing." };
  if (kid.member) return { standing: "ok", label: "Member", note: `Registered, and ${termLabel} is paid.` };
  return { standing: "pending", label: "Pending", note: `Registered. The place is confirmed once ${termLabel} is paid.` };
}

async function api(url: string, method: string, body?: unknown) {
  const response = await fetch(url, {
    method,
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const data = await response.json().catch(() => ({}));
  if (response.status === 401) { window.location.assign("/login?next=/members/profile"); throw new Error("Please sign in again."); }
  if (!response.ok) throw new Error(data.error ?? "Couldn't save that change. Please try again.");
  return data;
}

function Facts({ kid }: { kid: FamilyKid }) {
  const r = kid.registration;
  if (!r)
    return <p className={noteCopy}>Nothing is on file yet — the signed registration fills this in.</p>;
  const rhythm = r.sessionsPerWeek === "2" ? "Twice a week · Monday + Friday" : r.sessionsPerWeek === "1" ? "Once a week" : "Not chosen on this form";
  return (
    <dl className={factList}>
      <div>
        <dt>Age</dt>
        <dd>{kid.age === null ? "—" : `${kid.age} years`} · born {birthday(r.dateOfBirth)}</dd>
      </div>
      <div>
        <dt>Training rhythm</dt>
        <dd>{rhythm}</dd>
      </div>
      <div>
        <dt>Legal guardians</dt>
        <dd>{r.guardians.map((g) => `${g.name} (${g.relationship})\n${g.phone} · ${g.email}`).join("\n\n")}</dd>
      </div>
      <div>
        <dt>Emergency contact</dt>
        <dd>{`${r.emergencyName} (${r.emergencyRelationship})\n${r.emergencyPhone}`}</dd>
      </div>
      <div>
        <dt>Photos + video</dt>
        <dd>{r.media === "yes" ? "Yes — we may post photos and clips." : "No — we blur or leave them out."}</dd>
      </div>
      <div>
        <dt>Medical notes</dt>
        <dd>{r.medicalNotes || "None reported"}</dd>
      </div>
    </dl>
  );
}

function History({ kid }: { kid: FamilyKid }) {
  const { waivers, payments } = kid.history;
  return (
    <div className="mt-6 grid gap-6 sm:grid-cols-2">
      <div>
        <p className="font-mono text-[0.6rem] uppercase tracking-[0.16em] text-fg/55">Signed records</p>
        {waivers.length === 0 ? (
          <p className={cn("mt-2", noteCopy)}>Nothing signed yet.</p>
        ) : (
          <ul className={logList}>
            {waivers.map((record) => (
              <li key={record.id} className={logRow}>
                <span className={logWhen}>{day(record.signedAt)} · {record.termLabel}</span>
                <span className="mt-1 flex flex-wrap gap-x-4">
                  <a className={textButton} href={`/api/waivers/${record.id}`}>Download PDF</a>
                  <a className={textButton} href={`/api/waivers/${record.id}?format=audit`}>Signature record</a>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div>
        <p className="font-mono text-[0.6rem] uppercase tracking-[0.16em] text-fg/55">Payments recorded</p>
        {payments.length === 0 ? (
          <p className={cn("mt-2", noteCopy)}>Nothing recorded yet.</p>
        ) : (
          <ul className={logList}>
            {payments.map((payment, index) => (
              <li key={`${payment.term}-${payment.recordedAt}-${index}`} className={logRow}>
                <span className={logWhen}>{day(payment.recordedAt)} · {payment.termLabel}</span>
                <span className="mt-1 block">
                  {payment.status === "paid" ? "Paid" : "Marked unpaid"}
                  {payment.amountMur === null ? "" : ` · Rs ${payment.amountMur}`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Pass({ kid, termLabel, index, reload, report }: { kid: FamilyKid; termLabel: string; index: number; reload: () => Promise<void>; report: (message: string) => void }) {
  const tone = standingOf(kid, termLabel);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [contact, setContact] = useState({ contactName: kid.contactName ?? "", contactPhone: kid.contactPhone ?? "" });
  const [formLink, setFormLink] = useState<{ url: string; emailed: boolean } | null>(null);
  const file = useRef<HTMLInputElement>(null);

  async function run(action: () => Promise<string>) {
    setBusy(true);
    try { report(await action()); await reload(); }
    catch (error) { report(error instanceof Error ? error.message : "Something went wrong. Please try again."); }
    finally { setBusy(false); }
  }

  async function uploadPhoto() {
    const chosen = file.current?.files?.[0];
    if (!chosen) { report("Choose a photo first."); return; }
    if (chosen.size > MAX_PHOTO_BYTES) { report("Choose a photo smaller than 4 MB."); return; }
    await run(async () => {
      const response = await fetch(`/api/family/kids/${kid.id}/photo`, { method: "PUT", headers: { "Content-Type": chosen.type }, body: chosen });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "That photo could not be saved.");
      if (file.current) file.current.value = "";
      return `${kid.name}'s photo is saved.`;
    });
  }

  return (
    <article className={passCard} style={{ animationDelay: `${Math.min(index, 8) * 90}ms` }} data-duckie-pass data-standing={tone.standing}>
      <span className={passBand(tone.standing)} aria-hidden="true" />
      <span className={passPunch} aria-hidden="true" />
      <div className={passHead}>
        {kid.photoVersion ? (
          <img className={passPhoto} src={`/api/family/kids/${kid.id}/photo?v=${encodeURIComponent(kid.photoVersion)}`} alt={`${kid.name}'s profile photo`} width={80} height={80} />
        ) : (
          <span className={passPhotoEmpty} aria-hidden="true">{kid.name.slice(0, 1).toUpperCase()}</span>
        )}
        <div className="min-w-0 flex-1">
          <h3 className={passName}>{kid.name}</h3>
          <p className={passMeta}>{kid.age === null ? "Age on file after signing" : `${kid.age} years · Tamarin Bay`}</p>
          <p className="mt-2"><span className={stamp(tone.standing)}>{tone.label}</span></p>
        </div>
      </div>
      <p className="px-5 pb-4 text-[0.9rem] leading-[1.6] text-fg-muted">{tone.note}</p>
      {kid.age !== null && kid.age < RECOMMENDED_AGE && (
        <p className="mx-5 mb-4 rounded-xl border-2 border-alert px-4 py-3 text-[0.85rem] font-semibold leading-[1.5] text-alert">
          Under {RECOMMENDED_AGE}: have a word with the head coach about readiness before the next session.
        </p>
      )}
      <div className={passStub}>
        <span>{termLabel}</span>
        <span className={kid.payment?.status === "paid" ? "text-ok" : "text-caution"}>
          {kid.payment?.status === "paid" ? `Paid${kid.payment.amountMur === null ? "" : ` · Rs ${kid.payment.amountMur}`}` : kid.payment ? "Fee outstanding" : "Fee not recorded yet"}
        </span>
      </div>
      <div className={passStub}>
        <span>{CUP_LABEL}</span>
        {kid.cup ? (
          <span className="text-ok">On the list{kid.member ? " · free" : ""}</span>
        ) : (
          <a className={cn(textButton, "normal-case")} href="/sunset-duckies-cup-vol-2#register">Add {kid.name.split(" ")[0]} →</a>
        )}
      </div>

      <details className="group">
        <summary className={passSummary}>
          <span>Details, history + changes</span>
          <span className={passChevron} aria-hidden="true">›</span>
        </summary>
        <div className={passBody}>
          <Facts kid={kid} />
          <History kid={kid} />

          <div className={editPanel}>
            <p className="font-[650]">How the club reaches you about {kid.name.split(" ")[0]}</p>
            <p className={noteCopy}>The working number on this duckie's card — change it here any time. The guardians on the signed registration are separate.</p>
            {editing ? (
              <form
                className={memberForm}
                onSubmit={(event) => {
                  event.preventDefault();
                  void run(async () => {
                    await api(`/api/family/kids/${kid.id}`, "PATCH", contact);
                    setEditing(false);
                    return "Contact details saved.";
                  });
                }}
              >
                <label htmlFor={`contact-name-${kid.id}`}>Contact name</label>
                <input id={`contact-name-${kid.id}`} required maxLength={120} value={contact.contactName} onChange={(event) => setContact({ ...contact, contactName: event.target.value })} />
                <label htmlFor={`contact-phone-${kid.id}`}>Contact number</label>
                <input id={`contact-phone-${kid.id}`} type="tel" required maxLength={40} placeholder="+230 …" value={contact.contactPhone} onChange={(event) => setContact({ ...contact, contactPhone: event.target.value })} />
                <div className={editRow}>
                  <button type="submit" className={textButton} disabled={busy}>Save</button>
                  <button type="button" className={textButton} onClick={() => { setEditing(false); setContact({ contactName: kid.contactName ?? "", contactPhone: kid.contactPhone ?? "" }); }}>Cancel</button>
                </div>
              </form>
            ) : (
              <div className={editRow}>
                <span>{kid.contactName || "No name on file"} · {kid.contactPhone || "no number on file"}</span>
                <button type="button" className={textButton} onClick={() => setEditing(true)}>Edit</button>
              </div>
            )}
          </div>

          <form className={editPanel} onSubmit={(event) => { event.preventDefault(); void uploadPhoto(); }}>
            <p className="font-[650]">Profile photo</p>
            <p className={noteCopy}>So the coaches match faces to names on the beach. Private to the club — it is never published, whatever your media choice.</p>
            <label htmlFor={`photo-${kid.id}`}>Choose a photo</label>
            <input id={`photo-${kid.id}`} ref={file} type="file" accept="image/jpeg,image/png,image/webp" />
            <div className={editRow}>
              <button type="submit" className={textButton} disabled={busy}>Upload photo</button>
              {kid.photoVersion && (
                <button type="button" className={textButton} disabled={busy} onClick={() => void run(async () => { await api(`/api/family/kids/${kid.id}/photo`, "DELETE"); return "Photo removed."; })}>Remove photo</button>
              )}
            </div>
          </form>

          <div className={editPanel}>
            <p className="font-[650]">Update the signed details</p>
            <p className={noteCopy}>
              A date of birth, a medical note, a phone number, your media choice — or a brother or sister joining. Signed records are never edited in place, so we send you a private form to fill in and sign again. It takes about five minutes, no login, and your newest record is the one the club goes by.
            </p>
            {formLink ? (
              <>
                <p className={profileStatus}>
                  {formLink.emailed ? "The form is on its way to your inbox too." : "We couldn't email it — open it here instead."}
                </p>
                <Cta href={formLink.url} size="sm">Open {kid.name.split(" ")[0]}'s form</Cta>
              </>
            ) : (
              <div className={editRow}>
                <button
                  type="button"
                  className={textButton}
                  disabled={busy}
                  onClick={() => void run(async () => {
                    const data = await api(`/api/family/kids/${kid.id}/form`, "POST");
                    setFormLink({ url: data.url, emailed: data.emailed });
                    return `A private form for ${kid.name} is ready. It expires in 14 days.`;
                  })}
                >
                  Send me {kid.name.split(" ")[0]}'s form
                </button>
                {kid.invitation && !kid.invitation.completedAt && (
                  <span className={noteCopy}>The club already has a form open for you — this replaces it.</span>
                )}
              </div>
            )}
          </div>
        </div>
      </details>
    </article>
  );
}

export default function FamilyDeck({ profile }: { profile: FamilyProfile }) {
  const [family, setFamily] = useState(profile);
  const [status, setStatus] = useState("");
  const [name, setName] = useState(profile.name);
  const [editingName, setEditingName] = useState(false);

  const reload = useCallback(async () => {
    const next: FamilyProfile = await api("/api/family", "GET");
    setFamily(next);
    setName(next.name);
  }, []);

  return (
    <>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3" data-guardian>
        {editingName ? (
          <form
            className={cn(memberForm, "w-full max-w-sm")}
            onSubmit={(event) => {
              event.preventDefault();
              void (async () => {
                try {
                  await api("/api/family", "PATCH", { name });
                  setEditingName(false);
                  setStatus("Your name is saved.");
                  await reload();
                } catch (error) { setStatus(error instanceof Error ? error.message : "Couldn't save your name."); }
              })();
            }}
          >
            <label htmlFor="guardian-name">Your name</label>
            <input id="guardian-name" required maxLength={120} value={name} onChange={(event) => setName(event.target.value)} />
            <div className={editRow}>
              <button type="submit" className={textButton}>Save</button>
              <button type="button" className={textButton} onClick={() => { setName(family.name); setEditingName(false); }}>Cancel</button>
            </div>
          </form>
        ) : (
          <>
            <p className="font-mono text-[0.7rem] uppercase tracking-[0.18em] text-fg/60">
              {family.name ? <>{family.name} · </> : null}
              <span className="break-all lowercase tracking-[0.1em]">{family.email}</span>
            </p>
            <button type="button" className={textButton} onClick={() => setEditingName(true)}>
              {family.name ? "Change your name" : "Add your name"}
            </button>
          </>
        )}
      </div>

      <p className={profileStatus} role="status" aria-live="polite" data-profile-status>{status}</p>

      {family.kids.length === 0 ? (
        <p className={cn("mt-8 max-w-2xl", noteCopy)}>
          No duckies are registered under <span className="font-mono">{family.email}</span> yet. We match kids to the guardian email on their signed club registration — if the other parent signed, sign in with their address. New to the club? Start at <a className={textButton} href="/join">join the club</a>.
        </p>
      ) : (
        <>
          <div className={cn(passGrid, "mt-8")} data-duckie-passes>
            {family.kids.map((kid, index) => (
              <Pass key={kid.id} kid={kid} index={index} termLabel={family.term.label} reload={reload} report={setStatus} />
            ))}
          </div>
          <p className={cn("mt-6 max-w-2xl", noteCopy)}>
            Someone missing? A duckie appears here once their registration is signed with your email on it — the
            club matches families by the guardian emails on the form, nothing else.
          </p>
        </>
      )}
    </>
  );
}
