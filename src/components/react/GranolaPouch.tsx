import { useId } from "react";

// Printed pouch mock-up: a fixed dark board in both colour schemes, drawn from palette tokens.
const packs = {
  basic: {accent:"fill-bone",code:"01"},
  sports: {accent:"fill-acid",code:"02"},
  champ: {accent:"fill-warm",code:"03"},
};
const brand="font-brand text-[40px] font-normal tracking-[0.2px] fill-bone";
const caption="font-mono text-[6px] font-medium tracking-[0.6px]";

/** Printed type and straight folds stay crisp as recipe names and weights change. */
export default function GranolaPouch({id,name,grams}:{id:keyof typeof packs;name:string;grams:number}) {
  const uid=useId().replace(/:/g,"");
  const {accent,code}=packs[id];
  const words=name.trim().toUpperCase().split(/\s+/);
  const lines=words.join(" ").length>13&&words.length>1?(()=>{
    let first=words.shift()!;
    while(words.length>1&&first.length+words[0].length<name.length/2)first+=` ${words.shift()}`;
    return [first,words.join(" ")];
  })():[name.toUpperCase()];
  return <span className="relative flex h-[250px] w-full items-center justify-center overflow-hidden bg-slate-800 bg-[linear-gradient(color-mix(in_oklab,var(--color-bone)_3%,transparent)_1px,transparent_1px),linear-gradient(90deg,color-mix(in_oklab,var(--color-bone)_3%,transparent)_1px,transparent_1px)] bg-[size:32px_32px] max-[800px]:h-[210px] max-[520px]:h-[188px]" aria-hidden="true">
    <svg className="relative h-[234px] w-auto overflow-visible transition-transform duration-200 group-hover:-translate-y-1 motion-reduce:transition-none motion-reduce:group-hover:translate-y-0 max-[800px]:h-[195px] max-[520px]:h-[175px]" viewBox="0 0 220 290" fill="none" focusable="false">
      <defs><clipPath id={`${uid}-graphic`}><rect x="39" y="195" width="136" height="39"/></clipPath></defs>
      <path d="M39 29 H197 V279 H39Z" className="fill-black" opacity=".45"/>
      <path d="M28 17 H187 L196 27 V267 L187 274 H28Z" className="fill-slate-700 stroke-slate-400" strokeWidth=".8"/>
      <path d="M187 17 V262 L196 267 V27Z" className="fill-slate-600"/>
      <path d="M28 17 H187 V262 H28Z" className="fill-slate-900"/>
      <path d="M28 262 H187 V274 H28Z" className="fill-slate-700"/>
      <path d="M29 21 H185 M29 25 H185 M29 29 H185 M29 266 H185 M29 270 H185" className="stroke-slate-400" strokeOpacity=".35" strokeWidth=".6"/>
      <path d="M28 36 H187" className="stroke-slate-400" strokeWidth=".7"/>
      <path d="M28 39 H32 V43 H28 M187 39 H183 V43 H187" className="fill-slate-900"/>
      <text x="38" y="75" className={brand}>SUNSET</text>
      <text x="38" y="111" className={brand}>DUCKIES</text>
      <text x="39" y="126" className={`${caption} fill-slate-300`}>SMALL BATCH / GRANOLA</text>
      <rect x="39" y="138" width="136" height="45" className={accent}/>
      <g className="font-brand font-normal tracking-[0.2px] fill-slate-950">
        {lines.map((line,i)=><text key={i} x="45" y={lines.length===1?175:157+i*20} fontSize={lines.length===1?37:22} textLength={line.length>10?124:undefined} lengthAdjust="spacingAndGlyphs">{line}</text>)}
      </g>
      <g clipPath={`url(#${uid}-graphic)`} className={accent}>
        {id==="basic"?<><rect x="39" y="195" width="39" height="39"/><rect x="88" y="195" width="39" height="39"/><rect x="137" y="195" width="38" height="39"/></>
          :id==="sports"?<>{[0,1,2,3,4].map(i=><path key={i} d={`M${24+i*37} 195 h20 l-26 39 h-20Z`}/>)}</>
          :<><path d="M39 234 V195 H78 V214 H97 V195 H117 V214 H136 V195 H175 V234Z"/><rect x="46" y="219" width="8" height="15" className="fill-slate-900"/><rect x="159" y="219" width="8" height="15" className="fill-slate-900"/></>}
      </g>
      <path d="M39 243 H175" className="stroke-slate-400" strokeWidth=".6"/>
      <text x="39" y="255" className={`${caption} fill-bone`}>TAMARIN / {code}</text>
      <text x="175" y="255" textAnchor="end" className={`${caption} fill-bone`}>{grams} g</text>
    </svg>
  </span>;
}
