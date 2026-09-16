import type { calculate, OtherCost, Recipe } from "../../lib/granola";
import { Field, money, pretty } from "./GranolaField";

type Result=ReturnType<typeof calculate>;
const basisLabel:Record<OtherCost["basis"],string>={pack:"per made pack",sold:"per sold pack",batch:"per batch",month:"per month"};

// The whole month on one sheet: every operating assumption sits beside the
// monthly line it drives, so the case can be read and edited in one place.
export default function GranolaCaseSheet({recipe,result,change,cost}:{recipe:Recipe;result:Result|null;change:<K extends keyof Recipe>(key:K,value:Recipe[K])=>void;cost:(index:number,key:string,value:string|number)=>void}) {
  const monthly=(value:number|undefined)=>result&&value!==undefined?money(value,2):"—";
  return <section id="granola-business-sheet" className="g-editor-section g-sheet" aria-label="Business case sheet">
    <div className="g-section-title"><span>02 / THE BUSINESS CASE</span><b>One month, on one sheet.</b></div>
    <p className="g-explain">Every assumption behind the monthly result is here. Change a figure on the left and its line on the right updates at once. Ingredients follow the mix above; everything else is set on this sheet.</p>
    <div className="g-sheet-columns" aria-hidden="true"><span>Assumptions</span><span>This month</span></div>

    <div className="g-sheet-group">
      <h4>Sales</h4>
      <div className="g-sheet-row">
        <div className="g-sheet-inputs">
          <Field label="Selling price" value={recipe.price} suffix="Rs" onChange={v=>change("price",v)}/>
          <Field label="Packs produced monthly" value={recipe.monthlyPacks} onChange={v=>change("monthlyPacks",v)}/>
          <label className="g-slider g-sheet-slider"><span>Sell-through <strong>{recipe.sellThroughPercent}%</strong></span><input aria-label="Sell-through" type="range" min={0} max={100} value={recipe.sellThroughPercent} onChange={e=>change("sellThroughPercent",Number(e.target.value))}/></label>
        </div>
        <div className="g-sheet-amount"><span>Sales revenue</span><strong>{monthly(result?.revenue)}</strong><small>{result?`${recipe.monthlyPacks} made · ${result.sold} sold at ${money(recipe.price)} · ${result.unsold} written off`:"Complete the recipe"}</small></div>
      </div>
      <div className="g-sheet-row">
        <div className="g-sheet-inputs">
          <Field label="Payment / selling fee" value={recipe.feePercent} suffix="%" max={100} step={0.5} onChange={v=>change("feePercent",v)}/>
          <Field label="Retailer share" value={recipe.retailerPercent} suffix="%" max={100} step={0.5} onChange={v=>change("retailerPercent",v)}/>
        </div>
        <div className="g-sheet-amount"><span>Fees + retailer share</span><strong className="g-cost-line">{monthly(result?.monthlyFees)}</strong><small>{pretty(recipe.feePercent+recipe.retailerPercent)}% of the shelf price on each sold pack</small></div>
      </div>
      <p className="g-sheet-note">Fees and retailer share are percentages of the shelf price; direct collection starts with zero retailer share. Unsold stock is written off in this scenario, and a price change does not predict demand.</p>
    </div>

    <div className="g-sheet-group">
      <h4>Making</h4>
      <div className="g-sheet-row">
        <div className="g-sheet-inputs g-sheet-static"><span>Ingredients</span><p>{result?`${money(result.ingredients,2)} per finished ${recipe.packGrams} g pack, from the mix above.`:"Complete the mix above."} <a href="#granola-mix">Edit the mix ↑</a></p></div>
        <div className="g-sheet-amount"><span>Ingredients consumed</span><strong className="g-cost-line">{monthly(result?.monthlyIngredients)}</strong><small>{result?`${recipe.monthlyPacks} packs × ${money(result.ingredients,2)}`:"—"}</small></div>
      </div>
      <div className="g-sheet-row">
        <div className="g-sheet-inputs"><Field label="Ingredient waste allowance" value={recipe.wastePercent} suffix="%" max={100} onChange={v=>change("wastePercent",v)}/></div>
        <div className="g-sheet-amount"><span>Extra ingredient waste</span><strong className="g-cost-line">{monthly(result?.monthlyWaste)}</strong><small>Extra ingredient spending, separate from baking yield</small></div>
      </div>
      <div className="g-sheet-row">
        <div className="g-sheet-inputs">
          <Field label="Packs per batch" value={recipe.batchPacks} min={1} onChange={v=>change("batchPacks",v)}/>
          <Field label="Paid hours per batch" value={recipe.batchHours} suffix="h" step={0.25} onChange={v=>change("batchHours",v)}/>
          <Field label="Loaded hourly cost" value={recipe.hourlyCost} suffix="Rs" onChange={v=>change("hourlyCost",v)}/>
          <label className="g-field g-sheet-wide"><span>Batch costing</span><select aria-label="Batch costing" value={recipe.batchCostMode??"proportional"} onChange={e=>change("batchCostMode",e.target.value as Recipe["batchCostMode"])}><option value="whole">Pay for each started batch</option><option value="proportional">Scale time and batch costs with volume</option></select></label>
        </div>
        <div className="g-sheet-amount"><span>Production labour</span><strong className="g-cost-line">{monthly(result?.monthlyLabour)}</strong><small>{result?`${pretty(result.batches)} batches · ${pretty(result.productionHours)} h × ${money(recipe.hourlyCost)}`:"—"}</small></div>
      </div>
      <p className="g-sheet-note">Count everyone's paid time, including shopping, oven supervision and cleaning; the loaded rate includes employment costs. Batch costing decides whether a partial batch pays its full time and batch expenses or a proportional share.</p>
    </div>

    <div className="g-sheet-group">
      <h4>Other costs</h4>
      {recipe.costs.map((item,index)=><div className="g-sheet-row g-sheet-cost" key={item.id}>
        <div className="g-sheet-inputs">
          <label className="g-field"><span>Cost name</span><input aria-label={`Cost ${index+1} name`} maxLength={80} value={item.name} onChange={e=>cost(index,"name",e.target.value)}/></label>
          <Field label={`${item.name} amount`} displayLabel={item.calculation==="labour"?"Paid hours":"Amount"} value={item.amount} suffix={item.calculation==="labour"?"h":"Rs"} step={0.01} onChange={v=>cost(index,"amount",v)}/>
          <label className="g-field"><span>Entered as</span><select aria-label={`${item.name} calculation`} value={item.calculation??"money"} onChange={e=>{const calculation=e.target.value as "money"|"labour";const amount=calculation==="labour"?(recipe.hourlyCost>0?item.amount/recipe.hourlyCost:0):item.amount*recipe.hourlyCost;change("costs",recipe.costs.map((row,i)=>i===index?{...row,calculation,amount}:row));}}><option value="money">Rupees</option><option value="labour">Paid hours</option></select></label>
          <label className="g-field"><span>Applies to</span><select aria-label={`${item.name} basis`} value={item.basis} onChange={e=>cost(index,"basis",e.target.value)}><option value="pack">Made pack</option><option value="sold">Sold pack</option><option value="batch">Batch</option><option value="month">Month</option></select></label>
          <button type="button" className="g-remove" aria-label={`Remove ${item.name}`} onClick={()=>change("costs",recipe.costs.filter((_,i)=>i!==index))}>×</button>
        </div>
        <div className="g-sheet-amount"><span>{item.name.trim()||`Cost ${index+1}`}</span><strong className="g-cost-line">{monthly(result?.monthlyRows[index]?.monthly)}</strong><small>{item.calculation==="labour"?`${pretty(item.amount)} h × ${money(recipe.hourlyCost)} · `:""}{basisLabel[item.basis]}</small></div>
      </div>)}
      <button type="button" className="g-add" disabled={recipe.costs.length>=30} onClick={()=>change("costs",[...recipe.costs,{id:crypto.randomUUID(),name:"New cost",amount:0,basis:"month"}])}>+ Add cost</button>
      <p className="g-sheet-note">Choose rupees or paid hours, then when the cost applies. Paid hours use the loaded hourly rate above. Use “Sold pack” for order handling or delivery that grows with sales; add rent or insurance as monthly rows when they apply.</p>
    </div>

    <div className="g-sheet-totals" aria-label="Monthly totals">
      <div><span>Total monthly costs</span><strong>{monthly(result?.monthlyCost)}</strong></div>
      <div className="g-sheet-result" aria-live="polite"><span>MONTHLY RESULT / CURRENT DRAFT</span><strong className={result&&result.monthlyProfit<0?"negative":""}>{result?money(result.monthlyProfit):"—"}</strong><small>Sales revenue minus every line above. Before tax, setup costs and club contributions.</small></div>
    </div>
  </section>;
}
