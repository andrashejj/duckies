import { useEffect, useRef, useState } from "react";
import { calculate, starterPackIds, isStarterPack, newRecipe, recipeSchema, starterPacks, starterRecipe, type PackId, type Recipe, type SavedPack, type Revision } from "../../lib/granola";
import { addButton, board, boardLabel, boardList, boardNote, control, editorSection, errorMessage, explain, eyebrow, field, message, removeButton, sectionTitle, swatches, textarea, textButton } from "../../lib/studio-ui";
import GranolaScenarios from "./GranolaScenarios";
import GranolaCaseSheet from "./GranolaCaseSheet";
import { Field, money, pretty } from "./GranolaField";
import GranolaPouch from "./GranolaPouch";
import GranolaNutrition, { IngredientNutrition } from "./GranolaNutrition";
import { calculateNutrition } from "../../lib/granola-nutrition";

const taglines={basic:"The everyday mix",sports:"After the session",champ:"A little more generous"};
const toolbarButton="border-0 bg-transparent text-[0.72rem] text-fg";
const typeButton="rounded-[3px] border border-line bg-transparent px-[0.9rem] py-[0.65rem] text-[0.75rem] text-fg";
const ingredientGroup="m-0 min-w-0 rounded-[3px] border border-edge p-4 [&>legend]:px-[0.4rem] [&>legend]:text-[0.78rem] [&>legend]:font-semibold";
const ingredientFields="grid grid-cols-2 gap-[0.85rem]";
const rowTotal="mt-4 flex items-center justify-between gap-3 border-t border-line pt-3 [&>span]:text-[0.68rem] [&>span]:leading-[1.5] [&>span]:text-fg-muted [&>strong]:shrink-0 [&>strong]:font-mono [&>strong]:text-[0.9rem] [&>strong]:font-medium [&_small]:block [&_small]:text-[0.63rem] [&_small]:text-fg-muted [&_small]:break-words";
const compareCell="min-w-[140px] border-b border-line px-[0.7rem] py-[0.85rem] font-sans text-fg";

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
    {name:"Ingredients",amount:result.ingredients+result.waste,color:swatches[0]},
    {name:"Labour",amount:result.labour,color:swatches[1]},
    {name:"Other costs",amount:result.otherPerPack,color:swatches[4]},
    {name:"Selling",amount:result.selling,color:swatches[2]},
  ]:[];
  const comparison=packs.map(({id})=>({id,recipe:drafts[id],result:recipeSchema.safeParse(drafts[id]).success?calculate(drafts[id]):null}));
  return <div ref={studio} className="granola-studio theme-studio my-8 mb-12 overflow-clip rounded bg-canvas font-sans text-fg [&_a]:text-fg [&_button]:cursor-pointer [&_button:disabled]:cursor-not-allowed [&_button:disabled]:opacity-50 [&_:is(input,select,textarea,button,a):focus-visible]:outline-2 [&_:is(input,select,textarea,button,a):focus-visible]:outline-offset-[3px] [&_:is(input,select,textarea,button,a):focus-visible]:outline-accent-text" aria-label="Granola recipe simulator" aria-busy={loading}>
    <header className="flex items-center justify-between gap-8 bg-[radial-gradient(ellipse_at_90%_30%,color-mix(in_oklab,var(--highlight)_67%,transparent),transparent_65%)] p-[clamp(1.5rem,4vw,3.5rem)] max-[520px]:p-6"><div><span className={eyebrow}>SUNSET DUCKIES / TEST KITCHEN</span><h3 className="my-4 font-display text-[clamp(2.4rem,4.5vw,4.8rem)] font-medium leading-none tracking-[-0.045em] text-fg">Good ingredients.<br/><em className="font-normal not-italic text-accent-text">Better numbers.</em></h3><p className="m-0 text-[0.95rem] text-fg-muted max-[520px]:text-[0.8rem] max-[520px]:leading-[1.7]">Build the recipe. Pay for the work. Find a price that works.</p><span className="mt-4 flex flex-wrap gap-x-[1.4rem] gap-y-[0.4rem] [&>a]:inline-block [&>a]:text-[0.75rem] [&>a]:underline [&>a]:underline-offset-4"><a href="#granola-business-sheet">Business case sheet ↓</a><a href="#granola-nutrition">Nutrition notebook & AI adviser ↓</a></span></div><div className="flex h-[150px] w-[150px] shrink-0 rotate-[10deg] flex-col justify-center rounded-full border border-edge text-center font-mono text-[0.65rem] leading-[1.5] outline-1 outline-dashed -outline-offset-8 outline-edge max-[800px]:h-[110px] max-[800px]:w-[110px] max-[520px]:hidden">MADE IN<br/><strong className="font-display text-2xl font-medium">TAMARIN</strong><span className="mt-[0.6rem] text-[0.45rem] max-[800px]:text-[0.35rem]">SMALL BATCH / BIG IDEAS</span></div></header>
    <div className="flex items-center justify-between gap-4 border-t border-line px-6 py-4 max-[520px]:flex-col max-[520px]:items-start max-[520px]:p-4"><span className="font-mono text-[0.65rem] text-fg-muted">Your granola types</span><div className="flex flex-wrap gap-[0.65rem]"><button type="button" className={`${typeButton} border-accent bg-accent text-accent-fg`} onClick={()=>addType(false)} disabled={loading||saving}>+ New granola</button><button type="button" className={typeButton} onClick={()=>addType(true)} disabled={loading||saving}>Duplicate this recipe</button></div></div>
    <div className="grid grid-cols-3 border-y border-slate-500 bg-slate-950 max-[520px]:grid-cols-2" role="group" aria-label="Choose a granola pack">{packs.map((p,index)=>{
      const id=p.id;
      const changed=(!isStarterPack(id)&&p.version===0)||JSON.stringify(drafts[id])!==JSON.stringify(p.recipe);
      const isActive=active===id;
      return <button type="button" key={id} aria-pressed={isActive} className={`g-pack-choice group relative flex min-w-0 flex-col items-stretch gap-0 border-0 border-r border-b border-slate-500 p-0 text-left text-bone last:border-r-0 focus-visible:outline-acid! focus-visible:-outline-offset-4! ${isActive?"is-active bg-slate-700 shadow-[inset_0_-3px_var(--color-acid)]":"bg-slate-900"}`} disabled={saving||loading} onClick={()=>switchPack(id)}><GranolaPouch id={starterPackIds[index%starterPackIds.length]} name={drafts[id].name} grams={drafts[id].packGrams}/><span className="flex w-full min-w-0 flex-col gap-2 border-t border-slate-500 px-6 pt-5 pb-[1.4rem] max-[800px]:p-4 max-[520px]:gap-[0.4rem] max-[520px]:px-[0.8rem] max-[520px]:pt-[0.9rem] max-[520px]:pb-[1.1rem]"><small className="font-mono text-[0.55rem] tracking-[0.06em] text-slate-300 max-[520px]:text-[0.48rem] max-[520px]:leading-[1.5]">{String(index+1).padStart(2,"0")} / {changed?"UNSAVED MIX":p.version?`VERSION ${p.version}`:"STARTER MIX"}</small><strong className="font-brand text-[1.8rem] font-normal uppercase leading-none tracking-[0.02em] break-words max-[800px]:text-[1.5rem] max-[520px]:text-[1.4rem]">{drafts[id].name}</strong><span className="text-[0.75rem] text-slate-300 max-[520px]:text-[0.67rem] max-[520px]:leading-[1.45]">{isStarterPack(id)?taglines[id]:"Your own recipe"}</span></span><span className={`absolute top-4 right-4 z-[2] h-[19px] w-[19px] border max-[520px]:top-[10px] max-[520px]:right-[10px] ${isActive?"border-acid bg-acid after:mx-1 after:my-[5px] after:block after:h-1 after:w-2 after:-rotate-45 after:border-b-[1.5px] after:border-l-[1.5px] after:border-slate-950 after:content-['']":"border-slate-400 bg-slate-900"}`}/></button>;
    })}</div>
    <div className="flex items-center justify-between gap-4 border-b border-line bg-surface-2 px-6 py-4 max-[520px]:flex-col max-[520px]:items-stretch max-[520px]:gap-[0.9rem] max-[520px]:p-4"><div className="flex items-center gap-2 text-[0.72rem]"><i className={`block h-1.5 w-1.5 shrink-0 rounded-full ${online?"bg-ok":"bg-caution"}`}/>{loading?"Loading saved recipes…":!online?"Offline preview · saving unavailable":dirty?"Unsaved changes":saved.version?`Saved version ${saved.version}`:"Starter recipe · not yet saved"}</div><div className="flex items-center gap-3 max-[520px]:justify-between max-[520px]:gap-2 max-[520px]:[&>button]:text-[0.67rem]"><button type="button" className={toolbarButton} onClick={()=>void load()} disabled={loading||saving}>Load latest</button><button type="button" className={toolbarButton} onClick={()=>void showHistory()} disabled={loading||saving||!online}>{historyLoading?"Loading…":"Versions"}</button><button type="button" className={`${toolbarButton} rounded-[3px] bg-accent px-4 py-3 text-accent-fg`} onClick={()=>void save()} disabled={loading||saving||!online||!canEdit||!validation.success||(!dirty&&saved.version>0)}>{saving?"Saving…":"Save version ↗"}</button></div></div>
    {!canEdit&&!loading&&<p className="m-0 border-b border-line px-6 py-3 text-[0.75rem] leading-[1.7]">Try any changes below. Recipe saving and AI require edit access from Andras. <button type="button" className={textButton} onClick={async()=>{try{const r=await fetch("/api/granola");const d=await r.json();if(!r.ok)throw new Error(d.error);setCanEdit(d.canEdit);setOnline(true);setNotice(d.canEdit?"You can now save your edits.":"This account has view access. Ask Andras for edit access.");}catch{setError("Could not check sign-in. Please retry.");}}}>check access</button>.</p>}
    {error&&<p className={errorMessage} role="alert">{error}</p>}
    {notice&&<p className={message} role="status">{notice}</p>}
    {recipe.ingredients.some(i=>i.grams>0&&i.packPrice===0)&&<p className={message} role="status">This draft has unpriced ingredients. Add their shelf prices before relying on the margin.</p>}
    {!validation.success&&<p className={errorMessage} role="alert">{validation.error.issues[0]?.path.join(" → ")}: {validation.error.issues[0]?.message}</p>}
    {historyOpen&&<div className="border-b border-line bg-tint-2 p-6"><strong className="font-display text-[1.4rem] font-medium">Saved versions of {recipe.name}</strong>{history.length===0?<p>No saved versions yet.</p>:history.map(r=><button type="button" className="flex w-full flex-wrap justify-between gap-2 border-0 border-b border-line bg-transparent py-4 text-left text-[0.8rem] text-fg" key={r.version} onClick={()=>useVersion(r)}><span>v{r.version} · {r.recipe.name}</span><span>{new Date(r.createdAt).toLocaleString("en-GB")} · Load into editor ↗</span></button>)}</div>}
    <div className="grid grid-cols-[minmax(0,1fr)_350px] items-start max-[1050px]:grid-cols-[minmax(0,1fr)_310px] max-[800px]:grid-cols-1 min-[1300px]:grid-cols-[minmax(0,1fr)_390px]">
      <fieldset className="m-0 min-w-0 border-0 p-0" disabled={loading||saving} key={active}>
        <legend className="sr-only">Edit {recipe.name}</legend>
        <section id="granola-mix" className={editorSection}><div className={sectionTitle}><span>01 / THE MIX</span><b>Recipe & ingredients</b></div>
          <div className="grid grid-cols-[1.25fr_1fr_1fr] gap-4 max-[520px]:grid-cols-2 max-[520px]:[&>*:first-child]:col-span-full"><label className={`g-field ${field}`}><span>Pack name</span><input className={control} aria-label="Pack name" maxLength={60} value={recipe.name} onChange={e=>change("name",e.target.value)}/></label><Field label="Finished pack" value={recipe.packGrams} suffix="g" min={1} onChange={v=>change("packGrams",v)}/><Field label="Baking yield" value={recipe.yieldPercent} suffix="%" min={1} max={100} step={0.25} onChange={v=>change("yieldPercent",v)}/></div>
          <label className={`g-field ${field} mt-4`}><span>Recipe notes</span><textarea className={textarea} aria-label="Recipe notes" maxLength={1000} rows={2} value={recipe.note} onChange={e=>change("note",e.target.value)}/></label>
          <p className={explain}>Enter what you buy, then how much you use in your mix. Mix amounts set the proportions; we scale them to your finished pack and baking yield. Supplier discounts reduce the shelf price; freight and duty are added per purchased shelf pack. Record the actual quote in Source. For oil, use its weight in grams.</p>
          <div className="@container">{recipe.ingredients.map((item,index)=><div className="g-ingredient border-t border-line py-4" key={item.id}>
            <div className="mb-[0.65rem] flex items-center gap-[0.65rem]"><i className={`h-[9px] w-[9px] shrink-0 rounded-full ${swatches[index%swatches.length]}`}/><label className={`g-field ${field} flex-1`}><span className="sr-only">Ingredient {index+1} name</span><input className={`${control} border-transparent bg-transparent px-0 py-1 text-[0.93rem] font-semibold hover:border-b-edge`} aria-label={`Ingredient ${index+1} name`} maxLength={80} value={item.name} onChange={e=>ingredient(index,"name",e.target.value)}/></label><button type="button" className={removeButton} aria-label={`Remove ${item.name||"ingredient"}`} disabled={recipe.ingredients.length===1} onClick={()=>change("ingredients",recipe.ingredients.filter((_,i)=>i!==index))}>×</button></div>
            <div className="grid grid-cols-1 gap-4 @[560px]:grid-cols-2">
              <fieldset className={`${ingredientGroup} bg-surface/40`}>
                <legend>At the shop</legend>
                <div className={ingredientFields}>
                  <Field label={`${item.name} shelf quantity`} displayLabel="Shelf quantity" value={item.packSize} suffix="g" min={0.01} step={0.01} onChange={v=>ingredient(index,"packSize",v)}/>
                  <Field label={`${item.name} shelf price`} displayLabel="Shelf price" value={item.packPrice} suffix="Rs" step={0.01} onChange={v=>ingredient(index,"packPrice",v)}/>
                </div>
                <div className={`${ingredientFields} mt-[0.85rem]`}><Field label={`${item.name} supplier discount`} displayLabel="Supplier discount" value={item.discountPercent??0} suffix="%" max={100} step={0.5} onChange={v=>ingredient(index,"discountPercent",v)}/><Field label={`${item.name} sourcing cost`} displayLabel="Freight / duty per shelf pack" value={item.sourcingCost??0} suffix="Rs" step={0.01} onChange={v=>ingredient(index,"sourcingCost",v)}/></div>
                <label className="mt-[0.7rem] flex flex-col items-start gap-[0.3rem] text-[0.58rem] text-fg-muted [&>span]:shrink-0"><span>Source / assumption</span><input className="w-full min-w-0 border-0 border-b border-transparent bg-transparent text-[0.65rem] text-fg-muted hover:border-b-line max-[520px]:py-[0.15rem] max-[520px]:text-[16px] max-[520px]:not-focus:text-[0.65rem]" aria-label={`${item.name} source`} maxLength={500} value={item.source} onChange={e=>ingredient(index,"source",e.target.value)}/></label>
              </fieldset>
              <fieldset className={`${ingredientGroup} bg-highlight [&>.g-field]:max-w-[13rem]`}>
                <legend>In your mix</legend>
                <Field label={`${item.name} amount in mix`} displayLabel="Amount in mix" value={item.grams} suffix="g" step={1} onChange={v=>ingredient(index,"grams",v)}/>
                <div className={rowTotal}><span>Cost per finished pack<small>{result?`${pretty(result.rows[index].input)} g of ${item.name}`:"—"}</small></span><strong>{result?money(result.rows[index].cost,2):"—"}</strong></div>
              </fieldset>
            </div>
            <IngredientNutrition item={item} onChange={nutrition=>change("ingredients",recipe.ingredients.map((row,i)=>i===index?{...row,nutrition}:row))}/>
          </div>)}</div>
          <button type="button" className={addButton} disabled={recipe.ingredients.length>=40} onClick={()=>change("ingredients",[...recipe.ingredients,{id:crypto.randomUUID(),name:"New ingredient",grams:10,packSize:100,packPrice:0,source:"Price to confirm"}])}>+ Add ingredient</button>
          <div className="flex justify-between gap-4 pt-5 text-[0.73rem] max-[520px]:flex-col max-[520px]:gap-2 [&>strong]:font-medium"><span>Input for one {recipe.packGrams} g pack</span><strong>{result?`${pretty(result.rows.reduce((sum,i)=>sum+i.input,0))} g → ${recipe.packGrams} g baked`:"Complete the recipe"}</strong></div>
        </section>
        <GranolaCaseSheet recipe={recipe} result={result} change={change} cost={cost}/>
        <button type="button" className="mx-8 my-5 border-0 bg-transparent text-[0.7rem] text-fg-muted underline underline-offset-[3px]" onClick={()=>{if(window.confirm("Reset this draft? Saved versions remain available.")){setDrafts(old=>({...old,[active]:isStarterPack(active)?starterRecipe(active):structuredClone(saved.recipe)}));setNotice("Recipe reset in the editor. Save to keep this change.");}}}>{isStarterPack(active)?`Start again from the original ${active} mix`:saved.version?"Revert to the saved recipe":"Reset this draft"}</button>
      </fieldset>
      <aside ref={resultsPanel} id="granola-live-results" className={board} aria-label="Live business case">{result?<>
        <div className="flex flex-col gap-[0.6rem] [&>span:last-child]:text-[0.8rem] [&>span:last-child]:text-board-muted [&>span:last-child]:break-words"><span className={eyebrow}>THE CASE AT A GLANCE</span><span>{recipe.packGrams} g / {recipe.name}</span></div>
        <div className="g-profit my-8 mb-6 flex flex-col gap-3 [&>span]:text-[0.7rem] [&>span]:leading-[1.5] [&>span]:text-board-muted"><span>Contribution at full-batch efficiency</span><strong className={`font-display text-[clamp(2.2rem,3.3vw,3.7rem)] font-medium leading-none tracking-[-0.03em] break-words max-[800px]:text-[3.5rem] ${result.contribution<0?"text-loss":"text-signal"}`}>{money(result.contribution,2)}</strong><span>{result.margin===null?"Set a selling price":`${pretty(result.margin)}% contribution margin`} · before monthly costs</span></div>
        <div className="flex h-2 gap-[2px] overflow-hidden rounded-[2px] bg-board-line" aria-label="Cost composition">{bars.map(b=><span key={b.name} className={`min-w-0 basis-0 ${b.color}`} style={{flexGrow:b.amount}} title={`${b.name}: ${money(b.amount,2)}`}/>)}</div>
        <dl className={`mt-4 text-[0.72rem] ${boardList} [&_dt]:flex [&_dt]:items-center [&_dt]:gap-2`}>{bars.map(b=><div key={b.name}><dt><i className={`h-1.5 w-1.5 rounded-full ${b.color}`}/>{b.name}</dt><dd>{money(b.amount,2)}</dd></div>)}<div className="mt-2 border-t border-board-line pt-4!"><dt>Full-batch cost + selling / pack</dt><dd>{money(result.production+result.selling,2)}</dd></div><div><dt>Selling price</dt><dd>{money(recipe.price)}</dd></div></dl>
        <GranolaScenarios key={active} recipe={recipe} disabled={loading||saving} onChange={(key,value)=>change(key,value)}/>
        <div className="g-month mt-6 border-t border-board-line pt-6 [&>p]:my-2 [&>p]:mb-4 [&>p]:text-[0.68rem] [&>p]:leading-[1.6] [&>p]:text-board-muted" aria-live="polite"><span className={boardLabel}>MONTHLY RESULT / CURRENT DRAFT</span><strong className={`my-3 block font-display text-[2.4rem] font-medium ${result.monthlyProfit<0?"text-loss":"text-board-fg"}`}>{money(result.monthlyProfit)}</strong><p>{recipe.monthlyPacks} made · {result.sold} sold · {result.unsold} written off.<br/>Before tax, setup costs and club contributions.</p>
          <a className="my-[0.8rem] inline-block text-[0.7rem] text-signal! underline underline-offset-[3px]" href="#granola-business-sheet">Every line of this month is on the sheet ↗</a>
          <dl className={`text-[0.67rem] ${boardList}`}><div><dt>All costs / sold pack</dt><dd>{result.sold>0?money(result.monthlyCost/result.sold,2):"No sales"}</dd></div><div><dt>Monthly operating margin</dt><dd>{result.revenue>0?`${pretty(result.monthlyProfit/result.revenue*100)}%`:"No revenue"}</dd></div><div><dt>Production batches</dt><dd>{pretty(result.batches)}</dd></div><div><dt>Production / all paid time</dt><dd>{pretty(result.productionHours)} / {pretty(result.totalPaidHours)} h</dd></div><div><dt>First break-even production¹</dt><dd>{result.breakEvenProduced===null?"None ≤ 100,000 packs":`${result.breakEvenProduced} packs / month`}</dd></div><div><dt>Break-even price at this volume</dt><dd>{result.breakEvenPrice===null?"No sales / no retained revenue":money(Math.ceil(result.breakEvenPrice*100)/100,2)}</dd></div><div><dt>Price for 30% contribution²</dt><dd>{result.targetPrice===null?"Not reachable":money(Math.ceil(result.targetPrice*100)/100,2)}</dd></div></dl></div>
        <p className={`${boardNote} mt-4 mb-0`}>¹ First whole-pack volume with a non-negative monthly result, up to 100,000 packs. Starting another batch can reduce profit again.<br/>² Full reference batch, before recurring overhead and unsold stock. Monthly profit above includes both.</p>

      </>:<div className="py-4 leading-[1.6]"><strong>A few ingredients are missing.</strong><p>Complete the highlighted field values to calculate this recipe.</p></div>}</aside>
    </div>
    <GranolaNutrition key={active} recipe={recipe} canEdit={canEdit} disabled={loading||saving} onChange={next=>{setDrafts(old=>({...old,[active]:next}));setNotice("");}}/>
    <section className="border-t border-line bg-tint-2 p-8 max-[520px]:p-5 [&_.g-title>b]:max-[520px]:text-[1.6rem]"><div className={`g-title ${sectionTitle}`}><span>SIDE BY SIDE</span><b>Your mixes. Side by side.</b></div><p className="text-[0.8rem] leading-[1.6] text-fg-muted">Current edits, including unsaved changes. Each mix uses its own volume, price and cost assumptions. Contribution assumes a full batch; monthly profit includes partial batches and unsold stock.</p><div className="mt-4 overflow-x-auto" tabIndex={0} role="region" aria-label="Compare granola packs"><table className="w-full min-w-[520px] border-collapse text-left text-[0.8rem]"><thead><tr><th scope="col" className={`${compareCell} font-display text-[1.2rem] font-medium`}>Per recipe</th>{comparison.map(p=><th scope="col" className={`${compareCell} font-display text-[1.2rem] font-medium`} key={p.id}>{p.recipe.name}</th>)}</tr></thead><tbody>{[
      {name:"Selling price",value:(p:typeof comparison[number])=>money(p.recipe.price)},
      {name:"Ingredients / pack",value:(p:typeof comparison[number])=>p.result?money(p.result.ingredients,2):"—"},
      {name:"Full-batch contribution / pack",value:(p:typeof comparison[number])=>p.result?money(p.result.contribution,2):"—"},
      {name:"Monthly result",value:(p:typeof comparison[number])=>p.result?money(p.result.monthlyProfit):"—"},
      {name:"Protein / 100 g",value:(p:typeof comparison[number])=>{if(!p.result)return "—";const n=calculateNutrition(p.recipe,100).values.protein;return n.value===null?"Unknown":`${pretty(n.value)} g${n.complete?"":" (partial)"}`;}},
      {name:"Total sugars / 100 g",value:(p:typeof comparison[number])=>{if(!p.result)return "—";const n=calculateNutrition(p.recipe,100).values.sugars;return n.value===null?"Unknown":`${pretty(n.value)} g${n.complete?"":" (partial)"}`;}},
    ].map(row=><tr key={row.name}><th scope="row" className={`${compareCell} font-normal text-fg-muted`}>{row.name}</th>{comparison.map(p=><td className={`${compareCell} tabular-nums`} key={p.id}>{row.value(p)}</td>)}</tr>)}</tbody></table></div></section>
    {visible&&result&&<button type="button" className="fixed inset-x-0 bottom-0 z-[45] hidden w-full items-center justify-between gap-2 border-0 bg-board px-5 pt-[0.8rem] pb-[max(0.8rem,env(safe-area-inset-bottom))] text-left text-board-fg shadow-[0_-3px_18px_color-mix(in_oklab,var(--color-slate-950)_20%,transparent)] max-[800px]:flex [&>span]:text-[0.6rem] [&>span]:text-board-muted [&>span:last-child]:max-w-[70px] [&>span:last-child]:text-board-fg [&_strong]:mt-[0.3rem] [&_strong]:block [&_strong]:font-mono [&_strong]:text-[0.85rem] [&_strong]:font-medium [&_strong]:text-signal" onClick={()=>document.getElementById("granola-live-results")?.scrollIntoView({behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"instant":"smooth",block:"start"})}><span>Per pack<strong>{money(result.contribution,2)}</strong></span><span>Monthly result<strong>{money(result.monthlyProfit)}</strong></span><span>Business case ↗</span></button>}
    <footer className="border-t border-line px-8 py-6 text-[0.7rem] leading-[1.7] text-fg-muted max-[800px]:pb-[5.5rem] max-[520px]:p-5">Planning estimates in Mauritian rupees. Add as many granola types as you need. Basic starts from the researched supermarket basket below; Sports and Champ are recipe ideas to test. Costs use full precision and round only for display. This is an operating estimate; supplier receipts, paid time and actual sales determine its accuracy. Ingredient costs represent consumption, not the cash needed to buy whole supplier packs. Nutrition is estimated from ingredient references and baking yield; verify it before making product claims.</footer>
  </div>;
}
