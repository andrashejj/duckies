import { useId, useState } from "react";
import { calculate, type Recipe } from "../../lib/granola";
import { boardLabel, boardNote, chart } from "../../lib/studio-ui";

const money=(n:number,decimals=0)=>`Rs ${n.toLocaleString("en-GB",{minimumFractionDigits:decimals,maximumFractionDigits:decimals})}`;
const compact=(n:number)=>Math.abs(n)>=10000?`${(n/1000).toLocaleString("en-GB",{maximumFractionDigits:1})}k`:Math.round(n).toLocaleString("en-GB");
const niceMax=(n:number)=>{const step=10**Math.floor(Math.log10(Math.max(10,n)))/2;return Math.min(100000,Math.ceil(n/step)*step);};

export default function GranolaScenarios({recipe,disabled,onChange}:{recipe:Recipe;disabled:boolean;onChange:(key:"monthlyPacks"|"price"|"hourlyCost",value:number)=>void}) {
  const [mode,setMode]=useState<"volume"|"price"|"labour">("volume");
  const uid=useId().replace(/:/g,"");
  const base=calculate(recipe);
  const threshold=mode==="volume"?base.breakEvenProduced:mode==="price"?base.breakEvenPrice:null;
  const key=mode==="volume"?"monthlyPacks":mode==="price"?"price":"hourlyCost";
  const current=recipe[key], selected=current;
  const maximum=niceMax(Math.max(mode==="volume"?100:400,current*1.25,threshold!==null&&threshold<=100000?threshold*1.2:0));
  const scenario=(value:number)=>calculate({...recipe,[key]:value},{includeBreakEven:false});
  const preview=base;
  // Include every whole pack for small runs so batch jumps and rounded sales
  // stay visible; large ranges are sampled to keep the chart responsive.
  const coordinates=[...new Set([0,current,...Array.from({length:Math.min(maximum,1000)+1},(_,i)=>Math.round(maximum*i/Math.min(maximum,1000))),...(threshold!==null&&threshold<=maximum?[threshold]:[])])].filter(n=>n<=maximum).sort((a,b)=>a-b);
  const points=coordinates.map(value=>({value,profit:scenario(value).monthlyProfit}));
  const low=Math.min(0,...points.map(p=>p.profit)),high=Math.max(0,...points.map(p=>p.profit));
  const span=Math.max(1,high-low);
  const x=(v:number)=>43+v/maximum*242;
  const y=(v:number)=>128-(v-low)/span*101;
  const path=points.map(p=>`${x(p.value)},${y(p.profit)}`).join(" ");
  const zero=y(0);
  const choose=(v:number)=>onChange(key,v);
  const tab="rounded-[2px] border-0 bg-transparent px-[0.3rem] py-[0.55rem] text-[0.65rem] text-board-muted aria-pressed:bg-highlight aria-pressed:text-highlight-fg focus-visible:outline-signal";
  const preset="rounded-[3px] border border-board-line bg-transparent px-[0.45rem] py-[0.35rem] text-[0.6rem] text-board-muted aria-pressed:border-signal aria-pressed:text-signal focus-visible:outline-signal";
  return <div className={`g-scenarios ${chart}`} aria-label="Business scenario explorer">
    <span className={boardLabel}>WHAT IF / SAME DRAFT</span>
    <div className="my-[0.8rem] grid grid-cols-3 gap-[0.3rem] rounded border border-board-line p-[0.2rem]" role="group" aria-label="Scenario axis"><button type="button" className={tab} aria-pressed={mode==="volume"} onClick={()=>setMode("volume")}>Packs per month</button><button type="button" className={tab} aria-pressed={mode==="price"} onClick={()=>setMode("price")}>Selling price</button><button type="button" className={tab} aria-pressed={mode==="labour"} onClick={()=>setMode("labour")}>Hourly labour</button></div>
    <svg viewBox="0 0 300 171" role="img" aria-label={mode==="volume"?"Monthly profit from zero packs through break-even":mode==="price"?"Monthly profit by selling price":"Monthly profit by hourly labour cost"}>
      <defs><clipPath id={`${uid}-profit`}><rect x="42" y="20" width="244" height={Math.max(0,zero-20)}/></clipPath><clipPath id={`${uid}-loss`}><rect x="42" y={zero} width="244" height={Math.max(0,135-zero)}/></clipPath></defs>
      <rect x="43" y={zero} width="242" height={128-zero} className="fill-loss" opacity=".07"/>
      <line x1="43" x2="285" y1={zero} y2={zero} className="stroke-board-muted" strokeDasharray="3 4"/>
      <text x="1" y="12">MONTHLY RESULT / Rs</text>
      {[high,...(low<0&&high>0?[0]:[]),...(low!==high?[low]:[])].map((v,i)=><text key={i} x="35" y={y(v)+3} textAnchor="end">{compact(v)}</text>)}
      <polyline points={path} fill="none" className="stroke-signal" strokeWidth="2" clipPath={`url(#${uid}-profit)`}/>
      <polyline points={path} fill="none" className="stroke-loss" strokeWidth="2" clipPath={`url(#${uid}-loss)`}/>
      {[0,maximum/4,maximum/2,maximum*3/4,maximum].map(v=><text key={v} x={x(v)} y="146" textAnchor="middle">{compact(v)}</text>)}
      <text x="285" y="164" textAnchor="end">{mode==="volume"?"PACKS PRODUCED / MONTH":mode==="price"?"SELLING PRICE / Rs":"LABOUR / Rs PER HOUR"}</text>
      {threshold!==null&&threshold<=maximum&&<g><line x1={x(threshold)} x2={x(threshold)} y1="22" y2="131" className="stroke-board-muted" opacity=".5" strokeDasharray="2 4"/><circle cx={x(threshold)} cy={y(scenario(threshold).monthlyProfit)} r="3" className="fill-board-muted"/><title>{`First break-even: ${mode==="volume"?`${threshold} packs`:money(threshold,2)}`}</title></g>}
      <line x1={x(selected)} x2={x(selected)} y1={y(preview.monthlyProfit)} y2="131" className="stroke-board-fg" opacity=".45"/>
      <circle cx={x(selected)} cy={y(preview.monthlyProfit)} r="5" className={`stroke-board ${preview.monthlyProfit<0?"fill-loss":"fill-signal"}`} strokeWidth="2"/>
    </svg>
    <p className={`g-scenario-threshold ${boardNote} mt-[0.2rem] mb-4 text-board-fg/85`}>{mode==="labour"?"The hourly rate updates production and all costs entered as paid time.":threshold===null?(mode==="volume"?"No break-even within the modelled range (up to 100,000 packs).":"No break-even price without sales and retained revenue."):`First break-even: ${mode==="volume"?`${threshold.toLocaleString("en-GB")} packs / month`:`${money(Math.ceil(threshold*100)/100,2)} / pack`}${threshold>maximum?" (outside the chart)":""}.`}</p>
    <label className="flex items-center gap-2 text-[0.7rem] text-board-muted [&>span]:flex-1 [&>small]:text-[0.6rem]"><span>{mode==="volume"?"Try a monthly volume":mode==="price"?"Try a selling price":"Try an hourly labour cost"}</span><input aria-label={mode==="volume"?"Scenario packs per month":mode==="price"?"Scenario selling price":"Scenario hourly labour cost"} className="w-20 min-w-0 rounded-[3px] border border-board-line bg-board-fg/10 p-[0.4rem] text-[0.9rem] text-board-fg focus-visible:outline-signal max-[520px]:text-[16px]" type="number" disabled={disabled} min={0} max={100000} step={mode==="volume"?1:.01} value={selected} onChange={e=>{const v=Number(e.target.value);if(e.target.value!==""&&Number.isFinite(v)&&v>=0&&v<=100000)choose(mode==="volume"?Math.floor(v):v);}}/><small>{mode==="volume"?"packs":"Rs"}</small></label>
    <input className="my-4 mb-2 w-full accent-signal focus-visible:outline-signal" aria-label={mode==="volume"?"Explore monthly volume":mode==="price"?"Explore selling price":"Explore hourly labour cost"} type="range" disabled={disabled} min={0} max={maximum} step={1} value={selected} onChange={e=>choose(Number(e.target.value))}/>
    <div className="flex flex-wrap gap-[0.3rem]">{(mode==="volume"?[0,10,25,50,100]:[0,100,200,250,350]).map(v=><button type="button" className={preset} disabled={disabled} key={v} aria-pressed={selected===v} onClick={()=>choose(v)}>{mode==="volume"?`${v} packs`:`Rs ${v}${mode==="labour"?" / h":""}`}</button>)}</div>
    <div className="g-scenario-result flex flex-col gap-2 py-4 [&>span]:text-[0.66rem] [&>span]:text-board-muted"><span>{mode==="volume"?`${selected} made · ${preview.sold} sold at ${money(recipe.price)}`:`${preview.sold} sold at ${money(recipe.price)}${mode==="labour"?` · ${money(selected)} / h`:""}`}</span><strong className={`font-display text-[1.9rem] font-medium ${preview.monthlyProfit<0?"text-loss":"text-signal"}`}>{money(preview.monthlyProfit)}<small className="font-sans text-[0.65rem] text-board-muted"> / month</small></strong><span>{preview.monthlyProfit<0?"Loss":"Profit"} after {money(preview.overhead)} recurring overhead · total costs {money(preview.monthlyCost)}</span></div>
    <p className={boardNote}>Changes are written straight onto the business case sheet, so the monthly result and comparisons follow immediately. Save a version to keep them.</p>
    <p className={boardNote}>{mode==="volume"?(recipe.batchCostMode==="whole"?"Each started batch incurs its full paid time and batch expenses. Profit can dip when another batch starts.":"Labour and batch expenses scale proportionally with production."):mode==="price"?"Volume and sell-through stay as entered. Changing price does not predict customer demand.":"Costs entered as rupee amounts stay at their entered amount. Costs entered as paid hours follow this rate."}</p>
  </div>;
}
