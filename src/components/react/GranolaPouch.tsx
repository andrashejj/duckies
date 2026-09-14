import { useId } from "react";

const packs = {
  basic: {accent:"#f2f4ed",code:"01"},
  sports: {accent:"#d7ff3f",code:"02"},
  champ: {accent:"#ff6849",code:"03"},
};

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
  return <span className={`g-pouch-stage g-pouch-stage-${id}`} aria-hidden="true">
    <svg className="g-pouch-art" viewBox="0 0 220 290" fill="none" focusable="false">
      <defs><clipPath id={`${uid}-graphic`}><rect x="39" y="195" width="136" height="39"/></clipPath></defs>
      <path d="M39 29 H197 V279 H39Z" fill="#000" opacity=".45"/>
      <path d="M28 17 H187 L196 27 V267 L187 274 H28Z" fill="#17272d" stroke="#73807c" strokeWidth=".8"/>
      <path d="M187 17 V262 L196 267 V27Z" fill="#26373b"/>
      <path d="M28 17 H187 V262 H28Z" fill="#0b171d"/>
      <path d="M28 262 H187 V274 H28Z" fill="#17272d"/>
      <path d="M29 21 H185 M29 25 H185 M29 29 H185 M29 266 H185 M29 270 H185" stroke="#89928b" strokeOpacity=".35" strokeWidth=".6"/>
      <path d="M28 36 H187" stroke="#73807c" strokeWidth=".7"/>
      <path d="M28 39 H32 V43 H28 M187 39 H183 V43 H187" fill="#0b171d"/>
      <text x="38" y="75" fill="#f2f4ed" className="g-pouch-brand">SUNSET</text>
      <text x="38" y="111" fill="#f2f4ed" className="g-pouch-brand">DUCKIES</text>
      <text x="39" y="126" fill="#a4b0aa" className="g-pouch-caption">SMALL BATCH / GRANOLA</text>
      <rect x="39" y="138" width="136" height="45" fill={accent}/>
      <g fill="#071015" className="g-pouch-name">
        {lines.map((line,i)=><text key={i} x="45" y={lines.length===1?175:157+i*20} fontSize={lines.length===1?37:22} textLength={line.length>10?124:undefined} lengthAdjust="spacingAndGlyphs">{line}</text>)}
      </g>
      <g clipPath={`url(#${uid}-graphic)`} fill={accent}>
        {id==="basic"?<><rect x="39" y="195" width="39" height="39"/><rect x="88" y="195" width="39" height="39"/><rect x="137" y="195" width="38" height="39"/></>
          :id==="sports"?<>{[0,1,2,3,4].map(i=><path key={i} d={`M${24+i*37} 195 h20 l-26 39 h-20Z`}/>)}</>
          :<><path d="M39 234 V195 H78 V214 H97 V195 H117 V214 H136 V195 H175 V234Z"/><rect x="46" y="219" width="8" height="15" fill="#0b171d"/><rect x="159" y="219" width="8" height="15" fill="#0b171d"/></>}
      </g>
      <path d="M39 243 H175" stroke="#73807c" strokeWidth=".6"/>
      <text x="39" y="255" fill="#f2f4ed" className="g-pouch-caption">TAMARIN / {code}</text>
      <text x="175" y="255" textAnchor="end" fill="#f2f4ed" className="g-pouch-caption">{grams} g</text>
    </svg>
  </span>;
}
