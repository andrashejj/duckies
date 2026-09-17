import { useEffect,useState } from "react";
import type { BrandingStatus } from "../../lib/branding";
import { bBadge, bButton, bLink, bMono, bPanelTitle, bSecondary } from "../../lib/plan-ui";
type Entry={email:string;name:string;reason:string;status:BrandingStatus;can_edit:boolean;requested_at:string;version:number};
export default function BrandingApprovals(){
 const [entries,setEntries]=useState<Entry[]>([]);const [loading,setLoading]=useState(true);const [error,setError]=useState("");const [notice,setNotice]=useState("");const [busy,setBusy]=useState<string|null>(null);
 async function load(){setError("");try{const r=await fetch("/api/branding/approvals",{cache:"no-store"});const d=await r.json();if(!r.ok)throw new Error(d.error);setEntries(d.requests);}catch(e){setError(e instanceof Error?e.message:"Could not load requests.");}finally{setLoading(false);}}
 useEffect(()=>{void load();},[]);
 async function decide(entry:Entry,decision:"approved"|"denied"|"revoked",canEdit:boolean){setBusy(entry.email);setError("");setNotice("");try{
  const r=await fetch("/api/branding/approvals",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:entry.email,decision,canEdit,version:entry.version})});const d=await r.json();if(!r.ok)throw new Error(d.error);
  setNotice(`${entry.email}: ${decision}.`);await load();
 }catch(e){setError(e instanceof Error?e.message:"Could not update access.");}finally{setBusy(null);}}
 return <div className="mt-[42px] [&_[role=alert]]:text-warm [&_[role=status]]:text-accent-text"><div className={`${bMono} flex items-center justify-between gap-5 max-[760px]:items-start`}><p>{entries.filter(e=>e.status==="pending").length} pending · {entries.filter(e=>e.status==="approved").length} approved</p><button className={bLink} onClick={()=>void load()} disabled={Boolean(busy)}>Refresh requests</button></div>
 <p role="alert">{error}</p><p role="status">{notice}</p>{loading?<p>Loading requests…</p>:!entries.length?<div className="border border-dashed border-line p-8 leading-[1.8]">No verified requests yet. Share <a className={bLink} href="/branding-plan">the teaser page</a> to invite someone.</div>:entries.map(entry=><AccessRow key={`${entry.email}:${entry.version}`} entry={entry} busy={Boolean(busy)} decide={decide}/>)}</div>;
}
function AccessRow({entry,busy,decide}:{entry:Entry;busy:boolean;decide:(e:Entry,d:"approved"|"denied"|"revoked",edit:boolean)=>Promise<void>}){
 const [edit,setEdit]=useState(entry.can_edit);
 const badgeTone = entry.status === "approved" ? "border-accent text-accent-text" : entry.status === "pending" ? "text-warm" : "";
 return <article className="mt-[18px] border border-line bg-surface p-7 max-[760px]:p-5"><div className="flex items-center justify-between gap-5 max-[760px]:flex-col max-[760px]:items-start"><div><h2 className={`${bPanelTitle} max-[760px]:text-[27px]`}>{entry.name}</h2><p className="break-words">{entry.email}</p></div><span className={`${bBadge} ${badgeTone}`}>{entry.status}</span></div>
 {entry.reason&&<p className="my-5 leading-[1.7] whitespace-pre-wrap">{entry.reason}</p>}<p className={`${bMono} my-5 text-fg-muted`}>Requested {new Date(entry.requested_at).toLocaleDateString("en-GB",{year:"numeric",month:"short",day:"numeric",timeZone:"Indian/Mauritius"})}</p>
 <label className="my-6 flex items-center gap-[10px] text-[14px]"><input className="h-[18px] w-[18px] accent-accent" type="checkbox" checked={edit} disabled={busy} onChange={e=>setEdit(e.target.checked)}/>Allow recipe saving & AI</label>
 <div className="flex flex-wrap items-center gap-5"><button className={bButton} disabled={busy} onClick={()=>void decide(entry,"approved",edit)}>{entry.status==="approved"?"Update permissions":"Approve access"}</button>{entry.status==="approved"?<button className={bSecondary} disabled={busy} onClick={()=>void decide(entry,"revoked",false)}>Revoke access</button>:entry.status==="pending"&&<button className={bSecondary} disabled={busy} onClick={()=>void decide(entry,"denied",false)}>Decline</button>}</div></article>;
}
