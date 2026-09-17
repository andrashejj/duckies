import { useEffect, useRef, useState } from "react";
import { recipeSchema, type Ingredient, type Recipe } from "../../lib/granola";
import { calculateNutrition } from "../../lib/granola-nutrition";
import { emptyNutrients, ingredientNutrition, nutrients, nutritionProfiles, nutritionSourceUrl, profileNutrition, type Nutrition } from "../../lib/granola-nutrition-data";
import { applySuggestion, type Advice, type Suggestion } from "../../lib/granola-advice";
import { control, errorMessage, explain, eyebrow, field, sectionTitle, textarea } from "../../lib/studio-ui";

const notebookTitle="mt-2 mb-0 font-display text-[clamp(1.7rem,2.7vw,2.5rem)] font-medium leading-[1.05] tracking-[-0.035em] text-fg";
const goalButton="rounded-[3px] border border-line bg-transparent px-[0.6rem] py-[0.8rem] text-left text-[0.75rem] text-fg transition-colors aria-pressed:border-accent aria-pressed:bg-accent aria-pressed:text-accent-fg aria-pressed:after:float-right aria-pressed:after:text-signal aria-pressed:after:content-['_↗'] motion-reduce:transition-none";
const note="mt-[0.8rem] mb-0 text-[0.65rem] leading-[1.65] text-fg-muted";

const number=(n:number)=>n.toLocaleString("en-GB",{maximumFractionDigits:1});
const money=(n:number)=>`Rs ${n.toLocaleString("en-GB",{maximumFractionDigits:2})}`;

export function IngredientNutrition({item,onChange}:{item:Ingredient;onChange:(nutrition:Nutrition|null)=>void}) {
  const data=ingredientNutrition(item);
  const matched=nutritionProfiles.find(p=>profileNutrition(p).source===data?.source);
  return <details className="mt-3 border-t border-dashed border-line pt-[0.6rem] [&>summary]:cursor-pointer [&>summary]:text-[0.7rem] [&>summary]:text-fg-muted [&>summary>span]:float-right [&>summary>span]:font-semibold [&>summary>span]:text-fg"><summary>Nutrition reference <span>{matched?matched.name:data?"Custom values":"Missing data"}</span></summary>
    <label className={`g-field ${field} mt-[0.85rem]`}><span>Values per 100 g of input</span><select className={control} aria-label={`${item.name} nutrition reference`} value={matched?.id??(data?"custom":"none")} onChange={e=>{
      const profile=nutritionProfiles.find(p=>p.id===e.target.value);
      onChange(profile?profileNutrition(profile):e.target.value==="custom"?{source:"Product label / manual estimate",values:{...emptyNutrients}}:null);
    }}><option value="none">Not entered / unknown</option>{nutritionProfiles.map(p=><option key={p.id} value={p.id}>{p.name} · USDA</option>)}<option value="custom">Enter label values</option></select></label>
    {data&&<><div className="mt-3 grid grid-cols-4 gap-[0.65rem] max-[520px]:grid-cols-2 [&_.g-field>span]:text-[0.62rem]">{nutrients.map(n=><label className={`g-field ${field}`} key={n.key}><span>{n.label} ({n.unit})</span><input className={control} aria-label={`${item.name} ${n.label} per 100 g`} type="number" min={0} max={n.max} step="any" placeholder="Unknown" value={data.values[n.key]??""} onChange={e=>onChange({source:matched?`Edited from ${data.source}`:data.source,values:{...data.values,[n.key]:e.target.value===""?null:Number(e.target.value)}})}/></label>)}</div>
      <label className={`g-field ${field}`}><span>Nutrition source / assumptions</span><input className={control} aria-label={`${item.name} nutrition source`} maxLength={500} value={data.source} onChange={e=>onChange({...data,source:e.target.value})}/></label></>}
    <p className={explain}>Use the actual product label when available. A blank value stays unknown. Generic references may differ from your brand; split blends such as cinnamon + salt into separate ingredients.</p>
  </details>;
}

export default function GranolaNutrition({recipe,canEdit,disabled,onChange}:{recipe:Recipe;canEdit:boolean;disabled:boolean;onChange:(recipe:Recipe)=>void}) {
  const valid=recipeSchema.safeParse(recipe).success;
  const serving=recipe.servingGrams??50;
  const facts=valid?[calculateNutrition(recipe,100),calculateNutrition(recipe,serving),calculateNutrition(recipe,recipe.packGrams)]:null;
  const [configured,setConfigured]=useState<boolean|null>(null),[connectionError,setConnectionError]=useState(false);
  const [goal,setGoal]=useState("balanced"),[brief,setBrief]=useState("");
  const [busy,setBusy]=useState(false),[error,setError]=useState("");
  const [response,setResponse]=useState<{advice:Advice;recipe:Recipe;signature:string}|null>(null);
  const [applied,setApplied]=useState<string|null>(null);
  const controller=useRef<AbortController|null>(null);
  const signature=JSON.stringify(recipe);
  const stale=Boolean(response&&response.signature!==signature);
  async function checkConnection() {
    setConnectionError(false);
    try{const r=await fetch("/api/granola/advice");if(!r.ok)throw new Error();const d=await r.json();setConfigured(d.configured);}catch{setConnectionError(true);}
  }
  useEffect(()=>{void checkConnection();return()=>controller.current?.abort();},[]);
  async function ask() {
    setBusy(true);setError("");setApplied(null);
    const snapshot=structuredClone(recipe);
    controller.current=new AbortController();
    try {
      const r=await fetch("/api/granola/advice",{method:"POST",signal:controller.current.signal,headers:{"Content-Type":"application/json"},body:JSON.stringify({recipe:snapshot,goal,brief})});
      const data=await r.json();if(!r.ok)throw new Error(data.error||"Could not get suggestions.");
      setResponse({advice:data.advice,recipe:snapshot,signature:JSON.stringify(snapshot)});
    }catch(e){if(!controller.current?.signal.aborted)setError(e instanceof Error?e.message:"Could not get suggestions.");}
    finally{setBusy(false);}
  }
  function apply(suggestion:Suggestion) {
    if(!response||stale)return;
    try{const next=applySuggestion(recipe,suggestion);onChange(next);setApplied(JSON.stringify(next));}catch{setError("This suggestion no longer matches the recipe. Ask for a fresh review.");}
  }
  return <section className="scroll-mt-24 border-t border-line bg-linear-120 from-tint-2 to-transparent to-70% px-[clamp(1rem,3vw,2.5rem)] py-10" id="granola-nutrition" aria-label="Nutrition and AI adviser">
    <div className={sectionTitle}><span>03 / WHAT'S INSIDE</span><b>Nutrition</b></div>
    <div className="mt-6 grid grid-cols-[1.15fr_1fr] items-start gap-8 max-[850px]:grid-cols-1 max-[850px]:gap-6 [&>*]:min-w-0">
      <div className="border border-edge bg-surface p-6 shadow-[4px_4px_0_var(--line)] max-[520px]:px-3 max-[520px]:py-4">
        <div className="flex items-start justify-between gap-[0.8rem] border-b-[3px] border-fg pb-4 max-[520px]:flex-wrap"><div><span className={eyebrow}>RECIPE-DERIVED ESTIMATES</span><h4 className={notebookTitle}>Nutrition notebook</h4></div><span className="shrink-0 border border-line px-[0.4rem] py-1 font-mono text-[0.55rem] uppercase">{facts?.[0].complete?"Estimated":"Partial estimate"}</span></div>
        <label className="flex flex-wrap items-center gap-2 py-4 text-[0.75rem] [&>input]:w-[4.5rem] [&>input]:rounded-[3px] [&>input]:border [&>input]:border-line [&>input]:bg-surface [&>input]:p-[0.35rem] [&>input]:text-fg [&>small]:ml-auto [&>small]:text-fg-muted max-[520px]:[&>small]:ml-0 max-[520px]:[&>small]:w-full"><span>Serving size</span><input aria-label="Nutrition serving size" disabled={disabled} type="number" min={1} max={10000} step="any" value={serving} onChange={e=>{if(e.target.value!=="")onChange({...recipe,servingGrams:Number(e.target.value)});}}/><span>g</span><small>{valid?`${number(recipe.packGrams/serving)} servings / pack`:""}</small></label>
        <div className="overflow-auto [&_table]:w-full [&_table]:border-collapse [&_table]:text-[0.8rem] [&_table]:tabular-nums [&_:is(th,td)]:border-b [&_:is(th,td)]:border-line [&_:is(th,td)]:px-[0.35rem] [&_:is(th,td)]:py-[0.65rem] [&_:is(th,td)]:text-right [&_:is(th,td)]:align-middle [&_thead]:text-[0.65rem] [&_th:first-child]:pl-0 [&_th:first-child]:text-left [&_tbody_th]:font-medium [&_tbody_small]:ml-[0.4rem] [&_tbody_small]:inline-block [&_tbody_small]:text-[0.6rem] [&_tbody_small]:text-fg-muted [&_:is(th,td):nth-child(3)]:bg-highlight [&_tbody_tr:first-child_:is(th,td)]:border-t [&_tbody_tr:first-child_:is(th,td)]:border-fg [&_tbody_tr:first-child_:is(th,td)]:font-bold max-[520px]:[&_table]:text-[0.73rem] max-[520px]:[&_:is(th,td)]:px-[0.2rem] max-[520px]:[&_:is(th,td)]:py-[0.6rem]" tabIndex={0} role="region" aria-label="Estimated nutrition facts"><table><thead><tr><th scope="col">Estimated amount</th><th scope="col">100 g</th><th scope="col">{serving} g<br/><small>serving</small></th><th scope="col">{recipe.packGrams} g<br/><small>pack</small></th></tr></thead><tbody>{nutrients.map(n=><tr key={n.key}><th scope="row">{n.label}<small>{n.unit}</small></th>{[0,1,2].map(index=>{const v=facts?.[index].values[n.key];return <td key={index} title={v&&!v.complete?`Missing: ${v.missing.join(", ")}`:undefined}>{v?.value==null?"—":`${number(v.value)}${v.complete?"":"*"}`}</td>;})}</tr>)}</tbody></table></div>
        {facts&&!facts[0].complete&&<div className="mt-4 bg-warn p-[0.8rem] text-[0.7rem] leading-[1.6] [&>p]:mt-1 [&>p]:mb-0"><strong>Some of the recipe is still unmeasured.</strong><p>* Known ingredients only; actual totals may be higher. Missing or incomplete: {facts[0].missing.join(", ")}. Open “Nutrition reference” on each ingredient to complete its values.</p></div>}
        <details className="mt-4 text-[0.7rem] leading-[1.6] text-fg-muted [&>summary]:cursor-pointer [&>summary]:font-semibold [&>summary]:text-fg [&_p]:my-[0.6rem] [&_a]:underline"><summary>Sources & calculation</summary><p>Input nutrients are scaled to the finished pack using your {recipe.yieldPercent}% baking yield, then to each serving. We assume baking removes water and retains other nutrients. Purchasing waste is excluded.</p><p>Generic values: <a href={nutritionSourceUrl} target="_blank" rel="noreferrer">USDA Standard Reference 28 (2015) ↗</a>, with food IDs on each ingredient. Carbohydrate includes fibre. Sugars include natural and added sugars; added sugar is not separately estimated.</p><p>These are recipe estimates, not laboratory results or a packaging nutrition label. Use actual ingredient labels and measured batch yield to improve them.</p></details>
      </div>
      <div className="py-4 max-[850px]:p-0">
        <span className={eyebrow}>AI / KITCHEN COLLABORATOR</span><h4 className={notebookTitle}>Recipe suggestions</h4><p className="my-[0.8rem] mb-5 text-[0.85rem] leading-[1.65] text-fg-muted">Explore a change in the recipe. Compare its effect on nutrition and margin before trying a batch.</p>
        <fieldset className="my-6 grid grid-cols-2 gap-[0.6rem] border-0 p-0 [&>legend]:mb-[0.7rem] [&>legend]:text-[0.65rem] [&>legend]:uppercase [&>legend]:tracking-[0.1em]" disabled={disabled||busy}><legend>Choose a direction</legend>{[["balanced","A balanced mix"],["protein","More protein"],["less-sugar","Less sugar"],["lower-cost","Lower cost"]].map(([value,label])=><button type="button" className={goalButton} key={value} aria-pressed={goal===value} onClick={()=>setGoal(value)}>{label}</button>)}</fieldset>
        <label className={`g-field ${field}`}><span>Your brief <small>optional</small></span><textarea className={textarea} aria-label="AI recipe brief" rows={3} maxLength={1000} disabled={disabled||busy} value={brief} placeholder="Keep the almond crunch. Could we use less honey?" onChange={e=>setBrief(e.target.value)}/></label>
        <div className="my-4 mb-[0.6rem] text-[0.72rem] text-fg-muted [&>button]:border-0 [&>button]:bg-transparent [&>button]:px-[0.2rem] [&>button]:text-fg [&>button]:underline">{connectionError?<>Connection could not be checked. <button type="button" onClick={()=>void checkConnection()}>Retry</button></>:configured===null?"Checking AI connection…":!configured?<>AI is not connected yet. <button type="button" onClick={()=>void checkConnection()}>Check again</button></>:canEdit?"Connected · reviews the current unsaved recipe":"AI suggestions require edit access from Andras."}</div>
        <button type="button" className="w-full rounded-[3px] border border-accent-text bg-signal p-4 text-left text-[0.8rem] text-slate-950" disabled={!configured||connectionError||!canEdit||!valid||disabled||busy} onClick={()=>void ask()}>{busy?"Reviewing your mix…":"Suggest recipe experiments ↗"}</button>
        <p className={note}>The recipe, nutrition values, costs and brief are sent to OpenAI when you request a review. Changes only enter your draft when you apply them.</p>
        {error&&<p className={errorMessage} role="alert">{error}</p>}
      </div>
    </div>
    {response&&<div className="mt-8 border-t border-line pt-6" aria-label="AI recipe suggestions">
      <div className="flex justify-between gap-6 text-[0.9rem] leading-[1.6] max-[520px]:mb-4 max-[520px]:block [&_p]:my-2 [&_p]:mb-4 [&_p]:max-w-[65ch] [&>small]:shrink-0 [&>small]:font-mono [&>small]:text-[0.55rem] [&>small]:text-fg-muted"><div><span className={eyebrow}>REVIEW OF {response.recipe.name.toUpperCase()}</span><p>{response.advice.summary}</p></div><small>{response.advice.model} · {new Date(response.advice.generatedAt).toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"})}</small></div>
      {stale&&<p className="bg-warn p-[0.8rem] text-[0.75rem] leading-[1.6] [&>button]:ml-[0.7rem] [&>button]:border-0 [&>button]:bg-transparent [&>button]:text-fg [&>button]:underline">{applied===signature?"Experiment applied to your draft. Review the numbers and save a version to keep it.":"The recipe has changed since this review. Request new suggestions to match your current mix."}{applied===signature&&<button type="button" disabled={disabled} onClick={()=>{onChange(structuredClone(response.recipe));setApplied(null);}}>Undo experiment</button>}</p>}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,270px),1fr))] gap-4">{response.advice.suggestions.map((s,index)=><article key={index} className="flex min-w-0 flex-col border border-line bg-surface p-5 [&>h5]:my-[0.8rem] [&>h5]:font-display [&>h5]:text-[1.5rem] [&>h5]:font-medium [&>h5]:leading-[1.1] [&>h5]:text-fg [&_p]:my-2 [&_p]:text-[0.75rem] [&_p]:leading-[1.6] [&_ul]:my-2 [&_ul]:pl-4 [&_ul]:text-[0.75rem] [&_ul]:leading-[1.6] [&_dl]:my-4 [&_dl]:text-[0.65rem] [&_dl]:tabular-nums [&_dl>div]:flex [&_dl>div]:justify-between [&_dl>div]:gap-2 [&_dl>div]:border-t [&_dl>div]:border-line [&_dl>div]:py-[0.55rem] [&_dd]:m-0 [&_dd]:text-right [&_dd]:font-semibold [&>button]:mt-auto [&>button]:border-0 [&>button]:bg-accent [&>button]:p-[0.8rem] [&>button]:text-[0.75rem] [&>button]:text-accent-fg"><span className={eyebrow}>EXPERIMENT {String(index+1).padStart(2,"0")}</span><h5>{s.title}</h5><p>{s.reason}</p><ul>{s.changes.map(c=><li key={c.ingredientId}>{response.recipe.ingredients.find(i=>i.id===c.ingredientId)?.name}: <b>{number(response.recipe.ingredients.find(i=>i.id===c.ingredientId)!.grams)} → {number(c.mixGrams)} g</b></li>)}</ul>
        <dl>{(["protein","sugars","fibre"] as const).map(key=>{const before=response.advice.before.nutrition.values[key],after=s.after.nutrition.values[key];return <div key={key}><dt>{key==="sugars"?"Total sugars":key==="protein"?"Protein":"Fibre"} / {response.recipe.servingGrams??50} g</dt><dd>{before.value===null||after.value===null?"Incomplete data":`${number(before.value)} → ${number(after.value)} g${before.complete&&after.complete?"":"*"}`}</dd></div>;})}<div><dt>Ingredients / pack</dt><dd>{money(response.advice.before.ingredients)} → {money(s.after.ingredients)}</dd></div><div><dt>Contribution / pack</dt><dd>{money(response.advice.before.contribution)} → {money(s.after.contribution)}</dd></div></dl>
        <p className="text-fg-muted"><b>Kitchen test:</b> {s.tradeoff}</p><button type="button" disabled={disabled||busy||stale} onClick={()=>apply(s)}>Try this in the editor ↗</button>
      </article>)}</div>
      {response.advice.nextSteps.length>0&&<div className="mt-6 text-[0.8rem] leading-[1.7] [&_ul]:my-2 [&_ul]:pl-4"><strong>Before the next batch</strong><ul>{response.advice.nextSteps.map((step,index)=><li key={index}>{step}</li>)}</ul></div>}
      <p className={note}>Experiments are alternatives, each compared with the recipe reviewed above. Nutrition and costs are recalculated by the simulator. * Partial nutrition totals; complete the missing references before comparing them.</p>
    </div>}
  </section>;
}
