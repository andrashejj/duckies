import type { calculate, OtherCost, Recipe } from "../../lib/granola";
import { Field, money, pretty } from "./GranolaField";
import { addButton, control, costLine, editorSection, explain, field, removeButton, sectionTitle, sheetAmount, sheetInputs, sheetNote, sheetRow, slider } from "../../lib/studio-ui";

type Result=ReturnType<typeof calculate>;
const basisLabel:Record<OtherCost["basis"],string>={pack:"per made pack",sold:"per sold pack",batch:"per batch",month:"per month"};

// The whole month on one sheet: every operating assumption sits beside the
// monthly line it drives, so the case can be read and edited in one place.
export default function GranolaCaseSheet({recipe,result,change,cost}:{recipe:Recipe;result:Result|null;change:<K extends keyof Recipe>(key:K,value:Recipe[K])=>void;cost:(index:number,key:string,value:string|number)=>void}) {
  const monthly=(value:number|undefined)=>result&&value!==undefined?money(value,2):"—";
  const row=`g-sheet-row ${sheetRow} border-t border-line py-4 first-of-type:border-t-0`;
  const amount=`g-sheet-amount ${sheetAmount}`;
  const group="pt-6 [&>h4]:mb-1 [&>h4]:font-display [&>h4]:text-[1.25rem] [&>h4]:font-medium [&>h4]:tracking-[-0.02em] [&>h4]:text-fg";
  const costInputs=`${sheetInputs} grid-cols-[1.6fr_0.9fr_1fr_1.1fr_30px] gap-[0.6rem] @max-[600px]:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_30px] @max-[600px]:[grid-template-areas:'name_name_remove'_'amount_basis_basis'_'calc_calc_calc'] @max-[600px]:[&>:nth-child(1)]:[grid-area:name] @max-[600px]:[&>:nth-child(2)]:[grid-area:amount] @max-[600px]:[&>:nth-child(3)]:[grid-area:calc] @max-[600px]:[&>:nth-child(4)]:[grid-area:basis] @max-[600px]:[&>:nth-child(5)]:[grid-area:remove]`;
  const total="flex items-baseline justify-between gap-4 border-b border-line py-[0.9rem] [&>span]:text-[0.8rem] [&>strong]:font-mono [&>strong]:font-medium [&>strong]:tabular-nums";
  return <section id="granola-business-sheet" className={`g-sheet @container ${editorSection}`} aria-label="Business case sheet">
    <div className={sectionTitle}><span>02 / THE BUSINESS CASE</span><b>One month of costs and sales</b></div>
    <p className={explain}>Every assumption behind the monthly result is here. Change a figure on the left and its line on the right updates at once. Ingredients follow the mix above; everything else is set on this sheet.</p>
    <div className={`${sheetRow} mt-6 border-b-2 border-fg pb-[0.6rem] font-mono text-[0.6rem] tracking-[0.12em] text-fg-muted @max-[600px]:hidden [&>span:last-child]:text-right`} aria-hidden="true"><span>Assumptions</span><span>This month</span></div>

    <div className={group}>
      <h4>Sales</h4>
      <div className={row}>
        <div className={sheetInputs}>
          <Field label="Selling price" value={recipe.price} suffix="Rs" onChange={v=>change("price",v)}/>
          <Field label="Packs produced monthly" value={recipe.monthlyPacks} onChange={v=>change("monthlyPacks",v)}/>
          <label className={`${slider} col-span-2 gap-2 @max-[600px]:col-span-full [&>span]:text-[0.7rem]`}><span>Sell-through <strong>{recipe.sellThroughPercent}%</strong></span><input aria-label="Sell-through" type="range" min={0} max={100} value={recipe.sellThroughPercent} onChange={e=>change("sellThroughPercent",Number(e.target.value))}/></label>
        </div>
        <div className={amount}><span>Sales revenue</span><strong>{monthly(result?.revenue)}</strong><small>{result?`${recipe.monthlyPacks} made · ${result.sold} sold at ${money(recipe.price)} · ${result.unsold} written off`:"Complete the recipe"}</small></div>
      </div>
      <div className={row}>
        <div className={sheetInputs}>
          <Field label="Payment / selling fee" value={recipe.feePercent} suffix="%" max={100} step={0.5} onChange={v=>change("feePercent",v)}/>
          <Field label="Retailer share" value={recipe.retailerPercent} suffix="%" max={100} step={0.5} onChange={v=>change("retailerPercent",v)}/>
        </div>
        <div className={amount}><span>Fees + retailer share</span><strong className={costLine}>{monthly(result?.monthlyFees)}</strong><small>{pretty(recipe.feePercent+recipe.retailerPercent)}% of the shelf price on each sold pack</small></div>
      </div>
      <p className={sheetNote}>Fees and retailer share are percentages of the shelf price; direct collection starts with zero retailer share. Unsold stock is written off in this scenario, and a price change does not predict demand.</p>
    </div>

    <div className={group}>
      <h4>Making</h4>
      <div className={row}>
        <div className="block min-w-0 [&>span]:mb-[0.4rem] [&>span]:block [&>span]:text-[0.62rem] [&>span]:text-fg-muted [&>p]:m-0 [&>p]:text-[0.82rem] [&>p]:leading-[1.5] [&_a]:text-[0.72rem] [&_a]:whitespace-nowrap [&_a]:underline"><span>Ingredients</span><p>{result?`${money(result.ingredients,2)} per finished ${recipe.packGrams} g pack, from the mix above.`:"Complete the mix above."} <a href="#granola-mix">Edit the mix ↑</a></p></div>
        <div className={amount}><span>Ingredients consumed</span><strong className={costLine}>{monthly(result?.monthlyIngredients)}</strong><small>{result?`${recipe.monthlyPacks} packs × ${money(result.ingredients,2)}`:"—"}</small></div>
      </div>
      <div className={row}>
        <div className={sheetInputs}><Field label="Ingredient waste allowance" value={recipe.wastePercent} suffix="%" max={100} onChange={v=>change("wastePercent",v)}/></div>
        <div className={amount}><span>Extra ingredient waste</span><strong className={costLine}>{monthly(result?.monthlyWaste)}</strong><small>Extra ingredient spending, separate from baking yield</small></div>
      </div>
      <div className={row}>
        <div className={sheetInputs}>
          <Field label="Packs per batch" value={recipe.batchPacks} min={1} onChange={v=>change("batchPacks",v)}/>
          <Field label="Paid hours per batch" value={recipe.batchHours} suffix="h" step={0.25} onChange={v=>change("batchHours",v)}/>
          <Field label="Loaded hourly cost" value={recipe.hourlyCost} suffix="Rs" onChange={v=>change("hourlyCost",v)}/>
          <label className={`g-field ${field} col-span-2 @max-[600px]:col-span-full`}><span>Batch costing</span><select className={control} aria-label="Batch costing" value={recipe.batchCostMode??"proportional"} onChange={e=>change("batchCostMode",e.target.value as Recipe["batchCostMode"])}><option value="whole">Pay for each started batch</option><option value="proportional">Scale time and batch costs with volume</option></select></label>
        </div>
        <div className={amount}><span>Production labour</span><strong className={costLine}>{monthly(result?.monthlyLabour)}</strong><small>{result?`${pretty(result.batches)} batches · ${pretty(result.productionHours)} h × ${money(recipe.hourlyCost)}`:"—"}</small></div>
      </div>
      <p className={sheetNote}>Count everyone's paid time, including shopping, oven supervision and cleaning; the loaded rate includes employment costs. Batch costing decides whether a partial batch pays its full time and batch expenses or a proportional share.</p>
    </div>

    <div className={group}>
      <h4>Other costs</h4>
      {recipe.costs.map((item,index)=><div className={`${row} g-sheet-cost`} key={item.id}>
        <div className={costInputs}>
          <label className={`g-field ${field}`}><span>Cost name</span><input className={control} aria-label={`Cost ${index+1} name`} maxLength={80} value={item.name} onChange={e=>cost(index,"name",e.target.value)}/></label>
          <Field label={`${item.name} amount`} displayLabel={item.calculation==="labour"?"Paid hours":"Amount"} value={item.amount} suffix={item.calculation==="labour"?"h":"Rs"} step={0.01} onChange={v=>cost(index,"amount",v)}/>
          <label className={`g-field ${field}`}><span>Entered as</span><select className={control} aria-label={`${item.name} calculation`} value={item.calculation??"money"} onChange={e=>{const calculation=e.target.value as "money"|"labour";const amount=calculation==="labour"?(recipe.hourlyCost>0?item.amount/recipe.hourlyCost:0):item.amount*recipe.hourlyCost;change("costs",recipe.costs.map((row,i)=>i===index?{...row,calculation,amount}:row));}}><option value="money">Rupees</option><option value="labour">Paid hours</option></select></label>
          <label className={`g-field ${field}`}><span>Applies to</span><select className={control} aria-label={`${item.name} basis`} value={item.basis} onChange={e=>cost(index,"basis",e.target.value)}><option value="pack">Made pack</option><option value="sold">Sold pack</option><option value="batch">Batch</option><option value="month">Month</option></select></label>
          <button type="button" className={`${removeButton} mb-[3px]`} aria-label={`Remove ${item.name}`} onClick={()=>change("costs",recipe.costs.filter((_,i)=>i!==index))}>×</button>
        </div>
        <div className={amount}><span>{item.name.trim()||`Cost ${index+1}`}</span><strong className={costLine}>{monthly(result?.monthlyRows[index]?.monthly)}</strong><small>{item.calculation==="labour"?`${pretty(item.amount)} h × ${money(recipe.hourlyCost)} · `:""}{basisLabel[item.basis]}</small></div>
      </div>)}
      <button type="button" className={`${addButton} mt-3`} disabled={recipe.costs.length>=30} onClick={()=>change("costs",[...recipe.costs,{id:crypto.randomUUID(),name:"New cost",amount:0,basis:"month"}])}>+ Add cost</button>
      <p className={sheetNote}>Choose rupees or paid hours, then when the cost applies. Paid hours use the loaded hourly rate above. Use “Sold pack” for order handling or delivery that grows with sales; add rent or insurance as monthly rows when they apply.</p>
    </div>

    <div className="mt-8 border-t-2 border-fg" aria-label="Monthly totals">
      <div className={total}><span>Total monthly costs</span><strong>{monthly(result?.monthlyCost)}</strong></div>
      <div className="g-sheet-result mt-4 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-7 gap-y-4 rounded-[3px] bg-board px-6 py-[1.4rem] text-board-fg" aria-live="polite"><span className="font-mono text-[0.58rem] tracking-[0.11em] text-board-muted">MONTHLY RESULT / CURRENT DRAFT</span><strong className={`font-display text-[clamp(1.9rem,3vw,2.6rem)] tracking-[-0.03em] ${result&&result.monthlyProfit<0?"text-loss":"text-signal"}`}>{result?money(result.monthlyProfit):"—"}</strong><small className="col-span-full text-[0.65rem] leading-[1.6] text-board-muted">Sales revenue minus every line above. Before tax, setup costs and club contributions.</small></div>
    </div>
  </section>;
}
