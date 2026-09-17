import { useEffect, useState } from "react";
import { field, unit, unitInput, unitSuffix } from "../../lib/studio-ui";

export const money=(n:number, decimals=0)=>`Rs ${n.toLocaleString("en-GB",{minimumFractionDigits:decimals,maximumFractionDigits:decimals})}`;
export const pretty=(n:number)=>n.toLocaleString("en-GB",{maximumFractionDigits:1});

export function Field({label,displayLabel=label,value,onChange,suffix,step=1,min=0,max=1_000_000}:{label:string;displayLabel?:string;value:number;onChange:(n:number)=>void;suffix?:string;step?:number;min?:number;max?:number}) {
  const [text,setText]=useState(String(value));
  useEffect(()=>{setText(String(value));},[value]);
  return <label className={`g-field ${field}`}><span>{displayLabel}</span><span className={unit}><input className={unitInput} aria-label={label} type="number" min={min} max={max} step={step} value={text} onChange={e=>{const raw=e.target.value;setText(raw);if(raw!==""&&Number.isFinite(Number(raw)))onChange(Number(raw));}} onBlur={()=>{if(text==="")setText(String(value));}}/>{suffix&&<small className={unitSuffix}>{suffix}</small>}</span></label>;
}
