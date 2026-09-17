import { useState } from "react";
import { authClient } from "../../lib/auth-client";
import type { BrandingStatus } from "../../lib/branding";
import { bButton, bField, bLink, bPanel, bPanelTitle } from "../../lib/plan-ui";

export default function BrandingAccess({email:initialEmail,status,verified}:{email:string|null;status:BrandingStatus|null;verified:boolean}) {
  const [email,setEmail]=useState(initialEmail??"");
  const [name,setName]=useState("");const [reason,setReason]=useState("");
  const [step,setStep]=useState<"request"|"code">("request");const [code,setCode]=useState("");
  const [busy,setBusy]=useState(false);const [message,setMessage]=useState("");
  async function submitRequest(){
    const r=await fetch("/api/branding/request",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:email.trim().toLowerCase(),name,reason})});
    const data=await r.json();if(!r.ok)throw new Error(data.error);return data;
  }
  async function run(action:()=>Promise<void>){setBusy(true);setMessage("");try{await action();}catch(e){setMessage(e instanceof Error?e.message:"Could not connect. Please retry.");}finally{setBusy(false);}}
  const decided=initialEmail&&verified&&status;
  return <div className={`${bPanel} mt-12 [&_form]:mt-6 [&_form]:grid [&_form]:gap-5 [&_label]:grid [&_label]:gap-2 [&_label]:text-[13px] [&_label>span]:text-fg-muted [&_p]:my-[14px] [&_p]:text-[14px] [&_p]:leading-[1.7] [&_p]:text-fg-muted`}>
    {decided?<><h2 className={bPanelTitle}>{status==="pending"?"Your request is with Andras.":status==="denied"?"Access hasn’t been approved.":status==="revoked"?"Your access has been removed.":"You’re approved."}</h2>
      <p>{status==="pending"?"Check back here for a decision. Once approved, the workspace opens with this email.":"Andras manages access to this workspace."}</p>
      <p className="break-words">{initialEmail}</p><a className={bButton} href="/branding-plan">Check access</a></>:
      <><h2 className={bPanelTitle}>{step==="request"?"Pull up a chair.":"Check your inbox."}</h2>
      <p>{step==="request"?"Tell us who you are. Andras reviews every request.":`Enter the six-digit code sent to ${email}. It expires in 10 minutes.`}</p>
      <form onSubmit={event=>{event.preventDefault();void run(async()=>{
        if(step==="request"){
          const result=await submitRequest();if(initialEmail){window.location.assign("/branding-plan");return;}
          if(result.verifyEmail){const {error}=await authClient.emailOtp.sendVerificationOtp({email:email.trim().toLowerCase(),type:"sign-in"});if(error)throw new Error("Could not send a code. Please wait a minute and retry.");setStep("code");}
        }else{
          const {error}=await authClient.signIn.emailOtp({email:email.trim().toLowerCase(),otp:code});if(error)throw new Error("That code didn’t work. Check it or request another.");
          await submitRequest();window.location.assign("/branding-plan");
        }
      });}}>
        {step==="request"?<><label>Your name<input className={bField} autoComplete="name" required maxLength={80} value={name} onChange={e=>setName(e.target.value)}/></label>
          <label>Email address<input className={bField} type="email" autoComplete="email" required maxLength={254} readOnly={Boolean(initialEmail)} value={email} onChange={e=>setEmail(e.target.value)}/></label>
          <label>How would you like to contribute? <span>(optional)</span><textarea className={bField} maxLength={1000} rows={3} value={reason} onChange={e=>setReason(e.target.value)}/></label></>:
          <label>Six-digit code<input className={bField} autoFocus inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" required minLength={6} maxLength={6} value={code} onChange={e=>setCode(e.target.value)}/></label>}
        <button className={bButton} disabled={busy}>{busy?"One moment…":step==="code"?"Verify & request access":initialEmail?"Request access":"Request access"}</button>
        {step==="code"&&<button type="button" className={bLink} disabled={busy} onClick={()=>{setStep("request");setCode("");}}>Change email or resend code</button>}
      </form></>}
    <p role="status" aria-live="polite">{message}</p>
    {initialEmail?<button className={bLink} onClick={()=>void run(async()=>{const {error}=await authClient.signOut();if(error)throw new Error("Could not sign out. Please retry.");window.location.assign("/branding-plan");})}>Sign out</button>:<p>Already approved? <a className={bLink} href="/login?next=%2Fbranding-plan">Sign in →</a></p>}
  </div>;
}
