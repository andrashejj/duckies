import { useId, useState } from "react";
import { calculate, type Recipe } from "../../lib/granola";

const money=(n:number)=>`Rs ${n.toLocaleString("en-GB",{maximumFractionDigits:0})}`;
const compact=(n:number)=>Math.abs(n)>=10000?`${(n/1000).toLocaleString("en-GB",{maximumFractionDigits:1})}k`:Math.round(n).toLocaleString("en-GB");
const niceMax=(n:number)=>{const step=10**Math.floor(Math.log10(Math.max(10,n)))/2;return Math.min(100000,Math.ceil(n/step)*step);};

export default function GranolaScenarios({recipe,disabled,onApply}:{recipe:Recipe;disabled:boolean;onApply:(key:"monthlyPacks"|"price",value:number)=>void}) {
  const [mode,setMode]=useState<"volume"|"price">("volume");
  const [volume,setVolume]=useState(10),[price,setPrice]=useState<number|null>(null);
  const uid=useId().replace(/:/g,"");
  const base=calculate(recipe);
  const retained=1-(recipe.feePercent+recipe.retailerPercent)/100;
  const breakEvenPrice=base.sold>0&&retained>0?(recipe.monthlyPacks*base.production+base.overhead)/(base.sold*retained):null;
  const threshold=mode==="volume"?base.breakEvenProduced:breakEvenPrice;
  const current=mode==="volume"?recipe.monthlyPacks:recipe.price;
  const selected=mode==="volume"?volume:price??recipe.price;
  const key=mode==="volume"?"monthlyPacks":"price";
  const maximum=niceMax(Math.max(mode==="volume"?100:400,current*1.25,selected*1.1,threshold!==null&&threshold<=100000?threshold*1.2:0));
  const scenario=(value:number)=>calculate({...recipe,[key]:value});
  const preview=scenario(selected);
  const coordinates=[...new Set([0,10,current,selected,...Array.from({length:81},(_,i)=>Math.round(maximum*i/80)),...(threshold!==null&&threshold<=maximum?[mode==="volume"?threshold:Math.ceil(threshold)]:[])])].filter(n=>n<=maximum).sort((a,b)=>a-b);
  const points=coordinates.map(value=>({value,profit:scenario(value).monthlyProfit}));
  const low=Math.min(0,...points.map(p=>p.profit)),high=Math.max(0,...points.map(p=>p.profit));
  const span=Math.max(1,high-low);
  const x=(v:number)=>43+v/maximum*242;
  const y=(v:number)=>128-(v-low)/span*101;
  const path=points.map(p=>`${x(p.value)},${y(p.profit)}`).join(" ");
  const zero=y(0);
  const choose=(v:number)=>mode==="volume"?setVolume(v):setPrice(v);
  return <div className="g-chart g-scenarios" aria-label="Business scenario explorer">
    <span>WHAT IF WE START SMALL?</span>
    <div className="g-scenario-tabs" role="group" aria-label="Scenario axis"><button type="button" aria-pressed={mode==="volume"} onClick={()=>setMode("volume")}>Packs per month</button><button type="button" aria-pressed={mode==="price"} onClick={()=>setMode("price")}>Selling price</button></div>
    <svg viewBox="0 0 300 171" role="img" aria-label={mode==="volume"?"Monthly profit from zero packs through break-even":"Monthly profit from zero selling price through break-even"}>
      <defs><clipPath id={`${uid}-profit`}><rect x="42" y="20" width="244" height={Math.max(0,zero-20)}/></clipPath><clipPath id={`${uid}-loss`}><rect x="42" y={zero} width="244" height={Math.max(0,135-zero)}/></clipPath></defs>
      <rect x="43" y={zero} width="242" height={128-zero} fill="#eea17a" opacity=".07"/>
      <line x1="43" x2="285" y1={zero} y2={zero} stroke="#c3d0b0" strokeDasharray="3 4"/>
      <text x="1" y="12">MONTHLY RESULT / Rs</text>
      {[high,...(low<0&&high>0?[0]:[]),...(low!==high?[low]:[])].map((v,i)=><text key={i} x="35" y={y(v)+3} textAnchor="end">{compact(v)}</text>)}
      <polyline points={path} fill="none" stroke="#d7ff3f" strokeWidth="2" clipPath={`url(#${uid}-profit)`}/>
      <polyline points={path} fill="none" stroke="#ffb394" strokeWidth="2" clipPath={`url(#${uid}-loss)`}/>
      {[0,maximum/4,maximum/2,maximum*3/4,maximum].map(v=><text key={v} x={x(v)} y="146" textAnchor="middle">{compact(v)}</text>)}
      <text x="285" y="164" textAnchor="end">{mode==="volume"?"PACKS PRODUCED / MONTH":"SELLING PRICE / Rs"}</text>
      {threshold!==null&&threshold<=maximum&&<g><line x1={x(threshold)} x2={x(threshold)} y1="22" y2="131" stroke="#c3d0b0" opacity=".5" strokeDasharray="2 4"/><circle cx={x(threshold)} cy={zero} r="3" fill="#c3d0b0"/><title>{`Approximate break-even: ${mode==="volume"?`${threshold} packs`:money(threshold)}`}</title></g>}
      <line x1={x(selected)} x2={x(selected)} y1={y(preview.monthlyProfit)} y2="131" stroke="#eff0d8" opacity=".45"/>
      <circle cx={x(selected)} cy={y(preview.monthlyProfit)} r="5" fill={preview.monthlyProfit<0?"#ffb394":"#d7ff3f"} stroke="#213b31" strokeWidth="2"/>
    </svg>
    <p className="g-scenario-threshold">{threshold===null?"Break-even is not reachable with these assumptions.":`Approx. break-even: ${mode==="volume"?`${threshold.toLocaleString("en-GB")} packs / month`:`${money(threshold)} / pack`}${threshold>maximum?" (outside the chart)":""}.`}</p>
    <label className="g-scenario-input"><span>{mode==="volume"?"Try a monthly volume":"Try a selling price"}</span><input aria-label={mode==="volume"?"Scenario packs per month":"Scenario selling price"} type="number" min={0} max={100000} step={mode==="volume"?1:.01} value={selected} onChange={e=>{const v=Number(e.target.value);if(e.target.value!==""&&Number.isFinite(v)&&v>=0&&v<=100000)choose(mode==="volume"?Math.floor(v):v);}}/><small>{mode==="volume"?"packs":"Rs"}</small></label>
    <input className="g-scenario-slider" aria-label={mode==="volume"?"Explore monthly volume":"Explore selling price"} type="range" min={0} max={maximum} step={1} value={selected} onChange={e=>choose(Number(e.target.value))}/>
    <div className="g-scenario-presets">{(mode==="volume"?[0,10,25,50,100]:[0,100,200,250,350]).map(v=><button type="button" key={v} aria-pressed={selected===v} onClick={()=>choose(v)}>{mode==="volume"?`${v} packs`:`Rs ${v}`}</button>)}</div>
    <div className="g-scenario-result"><span>{mode==="volume"?`${selected} made · ${preview.sold} sold at ${money(recipe.price)}`:`${preview.sold} sold at ${money(selected)}`}</span><strong className={preview.monthlyProfit<0?"negative":""}>{money(preview.monthlyProfit)}<small> / month</small></strong><span>{preview.monthlyProfit<0?"Loss":"Profit"} after {money(preview.overhead)} monthly costs</span></div>
    <button type="button" className="g-scenario-apply" disabled={disabled||current===selected} onClick={()=>onApply(key,selected)}>Use {mode==="volume"?`${selected} packs / month`:money(selected)} in this draft ↗</button>
    <p>{mode==="volume"?"Same recipe, price and sell-through. Labour and batch costs scale proportionally.":"Same production volume and costs. This does not predict demand at a different price."}</p>
    {mode==="volume"&&selected>0&&selected<recipe.batchPacks&&<p className="g-small-batch">This assumes {preview.productionHours.toLocaleString("en-GB",{maximumFractionDigits:2})} paid hours. If a {selected}-pack run still takes {recipe.batchHours} hours, set “Packs per batch” to {selected} in the kitchen assumptions.</p>}
  </div>;
}
