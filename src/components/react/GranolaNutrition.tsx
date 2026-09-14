import { useEffect, useRef, useState } from "react";
import { recipeSchema, type Ingredient, type Recipe } from "../../lib/granola";
import { calculateNutrition } from "../../lib/granola-nutrition";
import { emptyNutrients, ingredientNutrition, nutrients, nutritionProfiles, nutritionSourceUrl, profileNutrition, type Nutrition } from "../../lib/granola-nutrition-data";
import { applySuggestion, type Advice, type Suggestion } from "../../lib/granola-advice";

const number=(n:number)=>n.toLocaleString("en-GB",{maximumFractionDigits:1});
const money=(n:number)=>`Rs ${n.toLocaleString("en-GB",{maximumFractionDigits:2})}`;

export function IngredientNutrition({item,onChange}:{item:Ingredient;onChange:(nutrition:Nutrition|null)=>void}) {
  const data=ingredientNutrition(item);
  const matched=nutritionProfiles.find(p=>profileNutrition(p).source===data?.source);
  return <details className="g-nutrient-editor"><summary>Nutrition reference <span>{matched?matched.name:data?"Custom values":"Missing data"}</span></summary>
    <label className="g-field"><span>Values per 100 g of input</span><select aria-label={`${item.name} nutrition reference`} value={matched?.id??(data?"custom":"none")} onChange={e=>{
      const profile=nutritionProfiles.find(p=>p.id===e.target.value);
      onChange(profile?profileNutrition(profile):e.target.value==="custom"?{source:"Product label / manual estimate",values:{...emptyNutrients}}:null);
    }}><option value="none">Not entered / unknown</option>{nutritionProfiles.map(p=><option key={p.id} value={p.id}>{p.name} · USDA</option>)}<option value="custom">Enter label values</option></select></label>
    {data&&<><div className="g-nutrient-inputs">{nutrients.map(n=><label className="g-field" key={n.key}><span>{n.label} ({n.unit})</span><input aria-label={`${item.name} ${n.label} per 100 g`} type="number" min={0} max={n.max} step="any" placeholder="Unknown" value={data.values[n.key]??""} onChange={e=>onChange({source:matched?`Edited from ${data.source}`:data.source,values:{...data.values,[n.key]:e.target.value===""?null:Number(e.target.value)}})}/></label>)}</div>
      <label className="g-field"><span>Nutrition source / assumptions</span><input aria-label={`${item.name} nutrition source`} maxLength={500} value={data.source} onChange={e=>onChange({...data,source:e.target.value})}/></label></>}
    <p className="g-explain">Use the actual product label when available. A blank value stays unknown. Generic references may differ from your brand; split blends such as cinnamon + salt into separate ingredients.</p>
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
  return <section className="g-nutrition-section" id="granola-nutrition" aria-label="Nutrition and AI adviser">
    <div className="g-section-title"><span>05 / WHAT'S INSIDE</span><b>A better mix, by the numbers.</b></div>
    <div className="g-nutrition-layout">
      <div className="g-nutrition-facts">
        <div className="g-nutrition-title"><div><span className="g-eyebrow">RECIPE-DERIVED ESTIMATES</span><h4>Nutrition notebook</h4></div><span className="g-estimate-tag">{facts?.[0].complete?"Estimated":"Partial estimate"}</span></div>
        <label className="g-serving"><span>Serving size</span><input aria-label="Nutrition serving size" disabled={disabled} type="number" min={1} max={10000} step="any" value={serving} onChange={e=>{if(e.target.value!=="")onChange({...recipe,servingGrams:Number(e.target.value)});}}/><span>g</span><small>{valid?`${number(recipe.packGrams/serving)} servings / pack`:""}</small></label>
        <div className="g-nutrition-table" tabIndex={0} role="region" aria-label="Estimated nutrition facts"><table><thead><tr><th scope="col">Estimated amount</th><th scope="col">100 g</th><th scope="col">{serving} g<br/><small>serving</small></th><th scope="col">{recipe.packGrams} g<br/><small>pack</small></th></tr></thead><tbody>{nutrients.map(n=><tr key={n.key}><th scope="row">{n.label}<small>{n.unit}</small></th>{[0,1,2].map(index=>{const v=facts?.[index].values[n.key];return <td key={index} title={v&&!v.complete?`Missing: ${v.missing.join(", ")}`:undefined}>{v?.value==null?"—":`${number(v.value)}${v.complete?"":"*"}`}</td>;})}</tr>)}</tbody></table></div>
        {facts&&!facts[0].complete&&<div className="g-nutrition-gap"><strong>Some of the recipe is still unmeasured.</strong><p>* Known ingredients only; actual totals may be higher. Missing or incomplete: {facts[0].missing.join(", ")}. Open “Nutrition reference” on each ingredient to complete its values.</p></div>}
        <details className="g-nutrition-method"><summary>Sources & calculation</summary><p>Input nutrients are scaled to the finished pack using your {recipe.yieldPercent}% baking yield, then to each serving. We assume baking removes water and retains other nutrients. Purchasing waste is excluded.</p><p>Generic values: <a href={nutritionSourceUrl} target="_blank" rel="noreferrer">USDA Standard Reference 28 (2015) ↗</a>, with food IDs on each ingredient. Carbohydrate includes fibre. Sugars include natural and added sugars; added sugar is not separately estimated.</p><p>These are recipe estimates, not laboratory results or a packaging nutrition label. Use actual ingredient labels and measured batch yield to improve them.</p></details>
      </div>
      <div className="g-ai-adviser">
        <span className="g-eyebrow">AI / KITCHEN COLLABORATOR</span><h4>What shall we try next?</h4><p>Explore a change in the recipe. Compare its effect on nutrition and margin before trying a batch.</p>
        <fieldset className="g-ai-goals" disabled={disabled||busy}><legend>Choose a direction</legend>{[["balanced","A balanced mix"],["protein","More protein"],["less-sugar","Less sugar"],["lower-cost","Lower cost"]].map(([value,label])=><button type="button" key={value} aria-pressed={goal===value} onClick={()=>setGoal(value)}>{label}</button>)}</fieldset>
        <label className="g-field"><span>Your brief <small>optional</small></span><textarea aria-label="AI recipe brief" rows={3} maxLength={1000} disabled={disabled||busy} value={brief} placeholder="Keep the almond crunch. Could we use less honey?" onChange={e=>setBrief(e.target.value)}/></label>
        <div className="g-ai-connection">{connectionError?<>Connection could not be checked. <button type="button" onClick={()=>void checkConnection()}>Retry</button></>:configured===null?"Checking AI connection…":!configured?<>AI is not connected yet. <button type="button" onClick={()=>void checkConnection()}>Check again</button></>:canEdit?"Connected · reviews the current unsaved recipe":"AI suggestions require edit access from Andras."}</div>
        <button type="button" className="g-ai-ask" disabled={!configured||connectionError||!canEdit||!valid||disabled||busy} onClick={()=>void ask()}>{busy?"Reviewing your mix…":"Suggest recipe experiments ↗"}</button>
        <p className="g-ai-note">The recipe, nutrition values, costs and brief are sent to OpenAI when you request a review. Changes only enter your draft when you apply them.</p>
        {error&&<p className="g-message g-error" role="alert">{error}</p>}
      </div>
    </div>
    {response&&<div className="g-ai-review" aria-label="AI recipe suggestions">
      <div className="g-ai-review-heading"><div><span className="g-eyebrow">REVIEW OF {response.recipe.name.toUpperCase()}</span><p>{response.advice.summary}</p></div><small>{response.advice.model} · {new Date(response.advice.generatedAt).toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"})}</small></div>
      {stale&&<p className="g-ai-stale">{applied===signature?"Experiment applied to your draft. Review the numbers and save a version to keep it.":"The recipe has changed since this review. Request new suggestions to match your current mix."}{applied===signature&&<button type="button" disabled={disabled} onClick={()=>{onChange(structuredClone(response.recipe));setApplied(null);}}>Undo experiment</button>}</p>}
      <div className="g-ai-suggestions">{response.advice.suggestions.map((s,index)=><article key={index} className="g-ai-suggestion"><span className="g-eyebrow">EXPERIMENT {String(index+1).padStart(2,"0")}</span><h5>{s.title}</h5><p>{s.reason}</p><ul>{s.changes.map(c=><li key={c.ingredientId}>{response.recipe.ingredients.find(i=>i.id===c.ingredientId)?.name}: <b>{number(response.recipe.ingredients.find(i=>i.id===c.ingredientId)!.grams)} → {number(c.mixGrams)} g</b></li>)}</ul>
        <dl>{(["protein","sugars","fibre"] as const).map(key=>{const before=response.advice.before.nutrition.values[key],after=s.after.nutrition.values[key];return <div key={key}><dt>{key==="sugars"?"Total sugars":key==="protein"?"Protein":"Fibre"} / {response.recipe.servingGrams??50} g</dt><dd>{before.value===null||after.value===null?"Incomplete data":`${number(before.value)} → ${number(after.value)} g${before.complete&&after.complete?"":"*"}`}</dd></div>;})}<div><dt>Ingredients / pack</dt><dd>{money(response.advice.before.ingredients)} → {money(s.after.ingredients)}</dd></div><div><dt>Contribution / pack</dt><dd>{money(response.advice.before.contribution)} → {money(s.after.contribution)}</dd></div></dl>
        <p className="g-ai-tradeoff"><b>Kitchen test:</b> {s.tradeoff}</p><button type="button" disabled={disabled||busy||stale} onClick={()=>apply(s)}>Try this in the editor ↗</button>
      </article>)}</div>
      {response.advice.nextSteps.length>0&&<div className="g-ai-next"><strong>Before the next batch</strong><ul>{response.advice.nextSteps.map((step,index)=><li key={index}>{step}</li>)}</ul></div>}
      <p className="g-ai-note">Experiments are alternatives, each compared with the recipe reviewed above. Nutrition and costs are recalculated by the simulator. * Partial nutrition totals; complete the missing references before comparing them.</p>
    </div>}
  </section>;
}
