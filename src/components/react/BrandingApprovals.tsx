import { useEffect,useState } from "react";
import type { BrandingStatus } from "../../lib/branding";
type Entry={email:string;name:string;reason:string;status:BrandingStatus;can_edit:boolean;requested_at:string;version:number};
export default function BrandingApprovals(){
 const [entries,setEntries]=useState<Entry[]>([]);const [loading,setLoading]=useState(true);const [error,setError]=useState("");const [notice,setNotice]=useState("");const [busy,setBusy]=useState<string|null>(null);
 async function load(){setError("");try{const r=await fetch("/api/branding/approvals",{cache:"no-store"});const d=await r.json();if(!r.ok)throw new Error(d.error);setEntries(d.requests);}catch(e){setError(e instanceof Error?e.message:"Could not load requests.");}finally{setLoading(false);}}
 useEffect(()=>{void load();},[]);
 async function decide(entry:Entry,decision:"approved"|"denied"|"revoked",canEdit:boolean){setBusy(entry.email);setError("");setNotice("");try{
  const r=await fetch("/api/branding/approvals",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:entry.email,decision,canEdit,version:entry.version})});const d=await r.json();if(!r.ok)throw new Error(d.error);
  setNotice(`${entry.email}: ${decision}.`);await load();
 }catch(e){setError(e instanceof Error?e.message:"Could not update access.");}finally{setBusy(null);}}
 return <div className="b-approvals"><div className="b-queue-head"><p>{entries.filter(e=>e.status==="pending").length} pending · {entries.filter(e=>e.status==="approved").length} approved</p><button className="b-link" onClick={()=>void load()} disabled={Boolean(busy)}>Refresh requests</button></div>
 <p role="alert">{error}</p><p role="status">{notice}</p>{loading?<p>Loading requests…</p>:!entries.length?<div className="b-empty">No verified requests yet. Share <a href="/branding-plan">the teaser page</a> to invite someone.</div>:entries.map(entry=><AccessRow key={`${entry.email}:${entry.version}`} entry={entry} busy={Boolean(busy)} decide={decide}/>)}</div>;
}
function AccessRow({entry,busy,decide}:{entry:Entry;busy:boolean;decide:(e:Entry,d:"approved"|"denied"|"revoked",edit:boolean)=>Promise<void>}){
 const [edit,setEdit]=useState(entry.can_edit);
 return <article className="b-request"><div className="b-request-heading"><div><h2>{entry.name}</h2><p>{entry.email}</p></div><span className={`b-badge b-badge-${entry.status}`}>{entry.status}</span></div>
 {entry.reason&&<p className="b-reason">{entry.reason}</p>}<p className="b-date">Requested {new Date(entry.requested_at).toLocaleDateString("en-GB",{year:"numeric",month:"short",day:"numeric",timeZone:"Indian/Mauritius"})}</p>
 <label className="b-checkbox"><input type="checkbox" checked={edit} disabled={busy} onChange={e=>setEdit(e.target.checked)}/>Allow recipe saving & AI</label>
 <div className="b-actions"><button className="b-button" disabled={busy} onClick={()=>void decide(entry,"approved",edit)}>{entry.status==="approved"?"Update permissions":"Approve access"}</button>{entry.status==="approved"?<button className="b-button b-secondary" disabled={busy} onClick={()=>void decide(entry,"revoked",false)}>Revoke access</button>:entry.status==="pending"&&<button className="b-button b-secondary" disabled={busy} onClick={()=>void decide(entry,"denied",false)}>Decline</button>}</div></article>;
}
