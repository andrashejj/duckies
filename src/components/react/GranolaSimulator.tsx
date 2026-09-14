import { useEffect, useRef, useState } from "react";
import { calculate, starterPackIds, isStarterPack, newRecipe, recipeSchema, starterPacks, starterRecipe, type PackId, type Recipe, type SavedPack, type Revision } from "../../lib/granola";
import "../../styles/granola.css";
import GranolaScenarios from "./GranolaScenarios";
import GranolaPouch from "./GranolaPouch";
import GranolaNutrition, { IngredientNutrition } from "./GranolaNutrition";
import { calculateNutrition } from "../../lib/granola-nutrition";

const money=(n:number, decimals=0)=>`Rs ${n.toLocaleString("en-GB",{minimumFractionDigits:decimals,maximumFractionDigits:decimals})}`;
const pretty=(n:number)=>n.toLocaleString("en-GB",{maximumFractionDigits:1});
const colors=["#b6c956","#df986a","#ad78a0","#ebbf51","#71a79a","#a5a099"];
const taglines={basic:"The everyday mix",sports:"After the session",champ:"A little more generous"};
function Field({label,value,onChange,suffix,step=1,min=0,max=1_000_000}:{label:string;value:number;onChange:(n:number)=>void;suffix?:string;step?:number;min?:number;max?:number}) {
  const [text,setText]=useState(String(value));
  useEffect(()=>{setText(String(value));},[value]);
  return <label className="g-field"><span>{label}</span><span className="g-input-unit"><input aria-label={label} type="number" min={min} max={max} step={step} value={text} onChange={e=>{const raw=e.target.value;setText(raw);if(raw!==""&&Number.isFinite(Number(raw)))onChange(Number(raw));}} onBlur={()=>{if(text==="")setText(String(value));}}/>{suffix&&<small>{suffix}</small>}</span></label>;
}

export default function GranolaSimulator() {
  const studio=useRef<HTMLDivElement>(null);
  const resultsPanel=useRef<HTMLElement>(null);
  const [visible,setVisible]=useState(false);
  const [packs,setPacks]=useState<SavedPack[]>(starterPacks);
  const [drafts,setDrafts]=useState<Record<PackId,Recipe>>(()=>Object.fromEntries(starterPacks().map(p=>[p.id,p.recipe])) as Record<PackId,Recipe>);
  const [active,setActive]=useState<PackId>("basic");
  const [loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[canEdit,setCanEdit]=useState(false),[online,setOnline]=useState(false);
  const [error,setError]=useState(""),[notice,setNotice]=useState("");
  const [history,setHistory]=useState<Revision[]>([]),[historyOpen,setHistoryOpen]=useState(false),[historyLoading,setHistoryLoading]=useState(false);
  const recipe=drafts[active];
  const saved=packs.find(p=>p.id===active)!;
  const dirty=(!isStarterPack(active)&&saved.version===0)||JSON.stringify(recipe)!==JSON.stringify(saved.recipe);
  const hasChanges=packs.some(p=>(!isStarterPack(p.id)&&p.version===0)||JSON.stringify(drafts[p.id])!==JSON.stringify(p.recipe));
  const validation=recipeSchema.safeParse(recipe);
  const result=validation.success?calculate(recipe):null;

  async function load(initial=false) {
    if(!initial&&hasChanges&&!window.confirm("Load saved recipes and discard your unsaved edits?"))return;
    setLoading(true);setError("");
    try {
      const response=await fetch("/api/granola"); const data=await response.json();
      if(!response.ok)throw new Error(data.error||"Could not load saved recipes.");
      setActive(current=>data.packs.some((p:SavedPack)=>p.id===current)?current:data.packs[0].id);
      setPacks(data.packs);setDrafts(Object.fromEntries(data.packs.map((p:SavedPack)=>[p.id,p.recipe])) as Record<PackId,Recipe>);
      setCanEdit(data.canEdit);setOnline(true);setHistoryOpen(false);
      if(!initial)setNotice("Loaded the latest saved recipes.");
    } catch(e){setOnline(false);setError(e instanceof Error?e.message:"Could not load saved recipes.");}
    finally{setLoading(false);}
  }
  useEffect(()=>{void load(true);},[]);
  useEffect(()=>{
    const panel=resultsPanel.current;if(!panel)return;
    const observer=new ResizeObserver(()=>panel.style.setProperty("--g-panel-height",`${panel.getBoundingClientRect().height}px`));
    observer.observe(panel);return()=>observer.disconnect();
  },[]);
  useEffect(()=>{
    const observer=new IntersectionObserver(([entry])=>setVisible(entry.isIntersecting));
    if(studio.current)observer.observe(studio.current);return()=>observer.disconnect();
  },[]);
  useEffect(()=>{
    const warn=(e:BeforeUnloadEvent)=>{if(hasChanges){e.preventDefault();}};
    window.addEventListener("beforeunload",warn);return()=>window.removeEventListener("beforeunload",warn);
  },[hasChanges]);
  function change<K extends keyof Recipe>(key:K,value:Recipe[K]) {setDrafts(old=>({...old,[active]:{...old[active],[key]:value}}));setNotice("");}
  function ingredient(index:number,key:string,value:string|number) {change("ingredients",recipe.ingredients.map((item,i)=>i===index?{...item,[key]:value}:item));}
  function cost(index:number,key:string,value:string|number) {change("costs",recipe.costs.map((item,i)=>i===index?{...item,[key]:value}:item));}
  async function save() {
    if(!validation.success)return;
    setSaving(true);setError("");setNotice("");
    try {
      const response=await fetch(`/api/granola/${active}`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({recipe,version:saved.version})});
      const data=await response.json();if(!response.ok)throw new Error(data.error||"Could not save this recipe.");
      setPacks(old=>old.map(p=>p.id===active?data.pack:p));setDrafts(old=>({...old,[active]:data.pack.recipe}));
      setNotice(`${recipe.name} saved as version ${data.pack.version}.`);setHistoryOpen(false);
    } catch(e){setError(e instanceof Error?e.message:"Could not save this recipe.");}
    finally{setSaving(false);}
  }
  async function showHistory() {
    if(historyOpen){setHistoryOpen(false);return;}
    setHistoryLoading(true);setError("");
    try {
      const response=await fetch(`/api/granola/${active}/history`);const data=await response.json();
      if(!response.ok)throw new Error(data.error||"Could not load versions.");
      setHistory(data.revisions);setHistoryOpen(true);
    }catch(e){setError(e instanceof Error?e.message:"Could not load versions.");}finally{setHistoryLoading(false);}
  }
  function useVersion(revision:Revision) {
    if(dirty&&!window.confirm("Replace your unsaved edits with this version?"))return;
    setDrafts(old=>({...old,[active]:structuredClone(revision.recipe)}));setHistoryOpen(false);
    setNotice(`Version ${revision.version} loaded into the editor. Save to make it the current recipe.`);
  }
  function addType(duplicate: boolean) {
    const id = `mix-${crypto.randomUUID()}`;
    const mix = duplicate ? structuredClone(recipe) : newRecipe();
    if (duplicate) mix.name = `${mix.name.slice(0, 53)} (copy)`;
    setPacks(old=>[...old,{id,recipe:structuredClone(mix),version:0,updatedAt:null}]);
    setDrafts(old=>({...old,[id]:mix}));
    setActive(id);setHistoryOpen(false);setError("");
    setNotice(duplicate?"Recipe copied into a new granola type. Rename it and save when ready.":"New granola type added. Name your recipe and add its ingredients.");
  }
  const switchPack=(id:PackId)=>{setActive(id);setHistoryOpen(false);setNotice("");setError("");};
  const bars=result?[
    {name:"Ingredients",amount:result.ingredients+result.waste,color:colors[0]},
    {name:"Labour",amount:result.labour,color:colors[1]},
    {name:"Other costs",amount:result.otherPerPack,color:colors[4]},
    {name:"Selling",amount:result.selling,color:colors[2]},
  ]:[];
  const comparison=packs.map(({id})=>({id,recipe:drafts[id],result:recipeSchema.safeParse(drafts[id]).success?calculate(drafts[id]):null}));
  return <div ref={studio} className="granola-studio" aria-label="Granola recipe simulator" aria-busy={loading}>
    <header className="g-studio-header"><div><span className="g-eyebrow">SUNSET DUCKIES / TEST KITCHEN</span><h3>Good ingredients.<br/><em>Better numbers.</em></h3><p>Build the recipe. Pay for the work. Find a price that works.</p><a className="g-notebook-link" href="#granola-nutrition">Nutrition notebook & AI adviser ↓</a></div><div className="g-stamp">MADE IN<br/><strong>TAMARIN</strong><span>SMALL BATCH / BIG IDEAS</span></div></header>
    <div className="g-type-actions"><span>Your granola types</span><div><button type="button" onClick={()=>addType(false)} disabled={loading||saving}>+ New granola</button><button type="button" onClick={()=>addType(true)} disabled={loading||saving}>Duplicate this recipe</button></div></div>
    <div className="g-packs" role="group" aria-label="Choose a granola pack">{packs.map((p,index)=>{
      const id=p.id;
      const changed=(!isStarterPack(id)&&p.version===0)||JSON.stringify(drafts[id])!==JSON.stringify(p.recipe);
      return <button type="button" key={id} aria-pressed={active===id} className={`g-pack-choice ${active===id?"is-active":""}`} disabled={saving||loading} onClick={()=>switchPack(id)}><GranolaPouch id={starterPackIds[index%starterPackIds.length]} name={drafts[id].name} grams={drafts[id].packGrams}/><span className="g-pack-copy"><small>{String(index+1).padStart(2,"0")} / {changed?"UNSAVED MIX":p.version?`VERSION ${p.version}`:"STARTER MIX"}</small><strong>{drafts[id].name}</strong><span>{isStarterPack(id)?taglines[id]:"Your own recipe"}</span></span><span className="g-selected-dot"/></button>;
    })}</div>
    <div className="g-toolbar"><div className="g-status"><i className={online?"online":""}/>{loading?"Loading saved recipes…":!online?"Offline preview · saving unavailable":dirty?"Unsaved changes":saved.version?`Saved version ${saved.version}`:"Starter recipe · not yet saved"}</div><div className="g-toolbar-actions"><button type="button" onClick={()=>void load()} disabled={loading||saving}>Load latest</button><button type="button" onClick={()=>void showHistory()} disabled={loading||saving||!online}>{historyLoading?"Loading…":"Versions"}</button><button type="button" className="g-save" onClick={()=>void save()} disabled={loading||saving||!online||!canEdit||!validation.success||(!dirty&&saved.version>0)}>{saving?"Saving…":"Save version ↗"}</button></div></div>
    {!canEdit&&!loading&&<p className="g-access">Try any changes below. Recipe saving and AI require edit access from Andras. <button type="button" onClick={async()=>{try{const r=await fetch("/api/granola");const d=await r.json();if(!r.ok)throw new Error(d.error);setCanEdit(d.canEdit);setOnline(true);setNotice(d.canEdit?"You can now save your edits.":"This account has view access. Ask Andras for edit access.");}catch{setError("Could not check sign-in. Please retry.");}}}>check access</button>.</p>}
    {error&&<p className="g-message g-error" role="alert">{error}</p>}
    {notice&&<p className="g-message" role="status">{notice}</p>}
    {recipe.ingredients.some(i=>i.grams>0&&i.packPrice===0)&&<p className="g-message" role="status">This draft has unpriced ingredients. Add their shelf prices before relying on the margin.</p>}
    {!validation.success&&<p className="g-message g-error" role="alert">{validation.error.issues[0]?.path.join(" → ")}: {validation.error.issues[0]?.message}</p>}
    {historyOpen&&<div className="g-history"><strong>Saved versions of {recipe.name}</strong>{history.length===0?<p>No saved versions yet.</p>:history.map(r=><button type="button" key={r.version} onClick={()=>useVersion(r)}><span>v{r.version} · {r.recipe.name}</span><span>{new Date(r.createdAt).toLocaleString("en-GB")} · Load into editor ↗</span></button>)}</div>}
    <div className="g-workbench">
      <fieldset className="g-editor" disabled={loading||saving} key={active}>
        <legend className="g-sr-only">Edit {recipe.name}</legend>
        <section className="g-editor-section"><div className="g-section-title"><span>01 / THE MIX</span><b>Recipe & ingredients</b></div>
          <div className="g-recipe-meta"><label className="g-field"><span>Pack name</span><input aria-label="Pack name" maxLength={60} value={recipe.name} onChange={e=>change("name",e.target.value)}/></label><Field label="Finished pack" value={recipe.packGrams} suffix="g" min={1} onChange={v=>change("packGrams",v)}/><Field label="Baking yield" value={recipe.yieldPercent} suffix="%" min={1} max={100} step={0.25} onChange={v=>change("yieldPercent",v)}/></div>
          <label className="g-field g-note"><span>Recipe notes</span><textarea aria-label="Recipe notes" maxLength={1000} rows={2} value={recipe.note} onChange={e=>change("note",e.target.value)}/></label>
          <p className="g-explain">Mix grams set the proportions. We scale the mix to your finished pack and baking yield. Shelf quantities are in grams; for oil, use its weight equivalent.</p>
          <div className="g-ingredient-list">{recipe.ingredients.map((item,index)=><div className="g-ingredient" key={item.id}>
            <div className="g-ingredient-heading"><i style={{background:colors[index%colors.length]}}/><label className="g-field"><span className="g-sr-only">Ingredient {index+1} name</span><input aria-label={`Ingredient ${index+1} name`} maxLength={80} value={item.name} onChange={e=>ingredient(index,"name",e.target.value)}/></label><button type="button" className="g-remove" aria-label={`Remove ${item.name||"ingredient"}`} disabled={recipe.ingredients.length===1} onClick={()=>change("ingredients",recipe.ingredients.filter((_,i)=>i!==index))}>×</button></div>
            <div className="g-ingredient-values"><Field label={`${item.name} mix grams`} value={item.grams} suffix="g" step={1} onChange={v=>ingredient(index,"grams",v)}/><Field label={`${item.name} shelf quantity`} value={item.packSize} suffix="g" min={0.01} step={0.01} onChange={v=>ingredient(index,"packSize",v)}/><Field label={`${item.name} shelf price`} value={item.packPrice} suffix="Rs" step={0.01} onChange={v=>ingredient(index,"packPrice",v)}/><div className="g-row-total"><span>Per finished pack</span><strong>{result?money(result.rows[index].cost,2):"—"}</strong><small>{result?`${pretty(result.rows[index].input)} g input`:"—"}</small></div></div>
            <label className="g-source"><span>Source / assumption</span><input aria-label={`${item.name} source`} maxLength={500} value={item.source} onChange={e=>ingredient(index,"source",e.target.value)}/></label>
            <IngredientNutrition item={item} onChange={nutrition=>change("ingredients",recipe.ingredients.map((row,i)=>i===index?{...row,nutrition}:row))}/>
          </div>)}</div>
          <button type="button" className="g-add" disabled={recipe.ingredients.length>=40} onClick={()=>change("ingredients",[...recipe.ingredients,{id:crypto.randomUUID(),name:"New ingredient",grams:10,packSize:100,packPrice:0,source:"Price to confirm"}])}>+ Add ingredient</button>
          <div className="g-mix-total"><span>Input for one {recipe.packGrams} g pack</span><strong>{result?`${pretty(result.rows.reduce((sum,i)=>sum+i.input,0))} g → ${recipe.packGrams} g baked`:"Complete the recipe"}</strong></div>
        </section>
        <section className="g-editor-section"><div className="g-section-title"><span>02 / THE KITCHEN</span><b>Time & production</b></div><div className="g-fields-grid"><Field label="Packs per batch" value={recipe.batchPacks} min={1} onChange={v=>change("batchPacks",v)}/><Field label="Paid hours per batch" value={recipe.batchHours} suffix="h" step={0.25} onChange={v=>change("batchHours",v)}/><Field label="Loaded hourly cost" value={recipe.hourlyCost} suffix="Rs" onChange={v=>change("hourlyCost",v)}/><Field label="Ingredient waste allowance" value={recipe.wastePercent} suffix="%" max={100} onChange={v=>change("wastePercent",v)}/></div><p className="g-explain">Count everyone's paid time, including shopping, oven supervision and cleaning. The loaded rate includes employment costs. Waste is extra ingredient spending, separate from baking yield.</p></section>
        <section className="g-editor-section"><div className="g-section-title"><span>03 / THE REST</span><b>Packaging & other costs</b></div><div className="g-other-costs">{recipe.costs.map((item,index)=><div className="g-cost-row" key={item.id}><label className="g-field"><span>Cost name</span><input aria-label={`Cost ${index+1} name`} maxLength={80} value={item.name} onChange={e=>cost(index,"name",e.target.value)}/></label><Field label={`${item.name} amount`} value={item.amount} suffix="Rs" step={0.01} onChange={v=>cost(index,"amount",v)}/><label className="g-field"><span>Applies to</span><select aria-label={`${item.name} basis`} value={item.basis} onChange={e=>cost(index,"basis",e.target.value)}><option value="pack">Each pack</option><option value="batch">Each batch</option><option value="month">Each month</option></select></label><button type="button" className="g-remove" aria-label={`Remove ${item.name}`} onClick={()=>change("costs",recipe.costs.filter((_,i)=>i!==index))}>×</button></div>)}</div><button type="button" className="g-add" disabled={recipe.costs.length>=30} onClick={()=>change("costs",[...recipe.costs,{id:crypto.randomUUID(),name:"New cost",amount:0,basis:"pack"}])}>+ Add cost</button></section>
        <section className="g-editor-section"><div className="g-section-title"><span>04 / THE BUSINESS</span><b>Price & monthly sales</b></div><div className="g-fields-grid"><Field label="Selling price" value={recipe.price} suffix="Rs" onChange={v=>change("price",v)}/><Field label="Packs produced monthly" value={recipe.monthlyPacks} onChange={v=>change("monthlyPacks",v)}/><Field label="Payment / selling fee" value={recipe.feePercent} suffix="%" max={100} step={0.5} onChange={v=>change("feePercent",v)}/><Field label="Retailer share" value={recipe.retailerPercent} suffix="%" max={100} step={0.5} onChange={v=>change("retailerPercent",v)}/></div><label className="g-slider"><span>Sell-through <strong>{recipe.sellThroughPercent}%</strong></span><input aria-label="Sell-through" type="range" min={0} max={100} value={recipe.sellThroughPercent} onChange={e=>change("sellThroughPercent",Number(e.target.value))}/><small>{result?.sold??0} sold / {recipe.monthlyPacks} made. Unsold stock is written off in this scenario.</small></label><p className="g-explain">Both selling fees and retailer share are percentages of the shelf price. Direct collection starts with zero retailer share. Batch costs and labour are prorated across volume.</p></section>
        <button type="button" className="g-reset" onClick={()=>{if(window.confirm("Reset this draft? Saved versions remain available.")){setDrafts(old=>({...old,[active]:isStarterPack(active)?starterRecipe(active):structuredClone(saved.recipe)}));setNotice("Recipe reset in the editor. Save to keep this change.");}}}>{isStarterPack(active)?`Start again from the original ${active} mix`:saved.version?"Revert to the saved recipe":"Reset this draft"}</button>
      </fieldset>
      <aside ref={resultsPanel} id="granola-live-results" className="g-results" aria-label="Live business case">{result?<>
        <div className="g-result-intro"><span className="g-eyebrow">YOUR BUSINESS CASE</span><span>{recipe.packGrams} g / {recipe.name}</span></div>
        <div className="g-profit"><span>Left from each sold pack</span><strong className={result.contribution<0?"negative":""}>{money(result.contribution,2)}</strong><span>{result.margin===null?"Set a selling price":`${pretty(result.margin)}% contribution margin`} · before monthly costs</span></div>
        <div className="g-cost-bar" aria-label="Cost composition">{bars.map(b=><span key={b.name} style={{background:b.color,flexGrow:b.amount}} title={`${b.name}: ${money(b.amount,2)}`}/>)}</div>
        <dl className="g-cost-breakdown">{bars.map(b=><div key={b.name}><dt><i style={{background:b.color}}/>{b.name}</dt><dd>{money(b.amount,2)}</dd></div>)}<div className="g-total"><dt>Total cost per sold pack</dt><dd>{money(result.production+result.selling,2)}</dd></div><div><dt>Selling price</dt><dd>{money(recipe.price)}</dd></div></dl>
        <div className="g-month"><span>MONTHLY RESULT</span><strong className={result.monthlyProfit<0?"negative":""}>{money(result.monthlyProfit)}</strong><p>After {money(result.overhead)} monthly costs.<br/>Before tax, setup costs and club contributions.</p><dl><div><dt>Sales / revenue</dt><dd>{result.sold} / {money(result.revenue)}</dd></div><div><dt>Production time</dt><dd>{pretty(result.productionHours)} paid hours</dd></div><div><dt>Break-even production¹</dt><dd>{result.breakEvenProduced===null?"Not reachable":`${result.breakEvenProduced} packs / month`}</dd></div><div><dt>Price for 30% margin²</dt><dd>{result.targetPrice===null?"Not reachable":money(Math.ceil(result.targetPrice))}</dd></div></dl></div>
        <GranolaScenarios key={active} recipe={recipe} disabled={loading||saving} onApply={(key,value)=>change(key,value)}/>
        <p className="g-result-footnote">¹ Uses your sell-through rate and prorated batch costs.<br/>² Per sold pack, before monthly costs and unsold stock.</p>
      </>:<div className="g-invalid"><strong>A few ingredients are missing.</strong><p>Complete the highlighted field values to calculate this recipe.</p></div>}</aside>
    </div>
    <GranolaNutrition key={active} recipe={recipe} canEdit={canEdit} disabled={loading||saving} onChange={next=>{setDrafts(old=>({...old,[active]:next}));setNotice("");}}/>
    <section className="g-compare"><div className="g-section-title"><span>SIDE BY SIDE</span><b>Your mixes. Side by side.</b></div><p>Current edits, including unsaved changes. Each pack uses its own volume, price and cost assumptions.</p><div className="g-comparison-table" tabIndex={0} role="region" aria-label="Compare granola packs"><table><thead><tr><th scope="col">Per recipe</th>{comparison.map(p=><th scope="col" key={p.id}>{p.recipe.name}</th>)}</tr></thead><tbody>{[
      {name:"Selling price",value:(p:typeof comparison[number])=>money(p.recipe.price)},
      {name:"Ingredients / pack",value:(p:typeof comparison[number])=>p.result?money(p.result.ingredients,2):"—"},
      {name:"Contribution / sold pack",value:(p:typeof comparison[number])=>p.result?money(p.result.contribution,2):"—"},
      {name:"Monthly result",value:(p:typeof comparison[number])=>p.result?money(p.result.monthlyProfit):"—"},
      {name:"Protein / 100 g",value:(p:typeof comparison[number])=>{if(!p.result)return "—";const n=calculateNutrition(p.recipe,100).values.protein;return n.value===null?"Unknown":`${pretty(n.value)} g${n.complete?"":" (partial)"}`;}},
      {name:"Total sugars / 100 g",value:(p:typeof comparison[number])=>{if(!p.result)return "—";const n=calculateNutrition(p.recipe,100).values.sugars;return n.value===null?"Unknown":`${pretty(n.value)} g${n.complete?"":" (partial)"}`;}},
    ].map(row=><tr key={row.name}><th scope="row">{row.name}</th>{comparison.map(p=><td key={p.id}>{row.value(p)}</td>)}</tr>)}</tbody></table></div></section>
    {visible&&result&&<button type="button" className="g-mobile-summary" onClick={()=>document.getElementById("granola-live-results")?.scrollIntoView({behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"instant":"smooth",block:"start"})}><span>Per pack<strong>{money(result.contribution,2)}</strong></span><span>Monthly result<strong>{money(result.monthlyProfit)}</strong></span><span>Business case ↗</span></button>}
    <footer className="g-studio-footer">Planning estimates in Mauritian rupees. Add as many granola types as you need. Basic starts from the researched supermarket basket below; Sports and Champ are recipe ideas to test. The simulator keeps full precision, so totals differ slightly from the rounded original case. Nutrition is estimated from ingredient references and baking yield; verify it before making product claims.</footer>
  </div>;
}
