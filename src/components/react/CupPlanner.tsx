import { useState } from 'react';
import { boundaryTies, cupTime, cupTimetable, DEFAULT_CUP_PLAN, roundReadiness, type CupPlan } from '../../lib/cup-planner';
import type { CompState } from '../../lib/server/comp';
import { input, mono, panel, panelTitle, primaryButton, select, smallButton } from '../../lib/comp-ui';

type Props = { state: CompState; busy: boolean; save: (plan: CupPlan) => void; chooseRound: (round: number | 'final') => void; buildFinals: (review?: { order: string[]; reason: string }) => void };
export default function CupPlanner({ state, busy, save, chooseRound, buildFinals }: Props) {
  const [kid, setKid] = useState('');
  const [order, setOrder] = useState<string[]>([]);
  const [reason, setReason] = useState('');
  const plan = state.config.plan ?? DEFAULT_CUP_PLAN;
  const table = cupTimetable({ ...state.config, rounds: 3, heatSize: 4, finalSize: 4, plan }, state.entrants.length, state.heats)!;
  const names = new Map(state.entrants.map(k => [k.id, k.name]));
  const finalsReady = !roundReadiness(state.entrants, state.heats, 3) && state.entrants.length > 0;
  const tied = boundaryTies(state.standings);
  const sorted = order.length === state.standings.length && order.every(id => names.has(id)) ? order.map(id => state.standings.find(row => row.kidId === id)!) : state.standings;
  const remaining = [1, 2, 3].find(round => !state.heats.some(h => h.stage === 'round' && h.round === round) || state.heats.some(h => h.stage === 'round' && h.round === round && h.status !== 'done'));
  const finalDrawn = state.heats.some(h => h.stage === 'final');
  function swap(index: number, direction: number) { const ids = sorted.map(row => row.kidId); [ids[index], ids[index + direction]] = [ids[index + direction], ids[index]]; setOrder(ids); }
  return <section className={`${panel} grid gap-5`} aria-labelledby="cup-planner-title">
    <div><p className={mono}>16 October · Mauritius time · meet at 14:00</p><h2 id="cup-planner-title" className={panelTitle}>Four surfs for every kid</h2><p className="mt-2 text-sm text-fg-muted">Three rounds, then a placement final. Nobody is eliminated. The top four contest the Cup in the last heat.</p></div>
    <ol className="grid gap-3 text-sm sm:grid-cols-4">
      <li><strong>1 · Shuffle</strong><p>Random opening heats. Every registered child gets a slot.</p></li>
      <li><strong>2 · Meet new surfers</strong><p>{plan.seedAfter === 1 ? "Start grouping nearby scores, minimising repeats within each score band." : "Mix the field again and minimise repeat opponents."} Rashie colours rotate.</p></li>
      <li><strong>3 · Surf near your level</strong><p>Group nearby qualifying scores. An easier group gives no extra points.</p></li>
      <li><strong>4 · Finals for all</strong><p>Three-round average sets final groups. Lower groups surf first; the Cup final goes last.</p></li>
    </ol>
    <details open={!state.config.plan}><summary className="cursor-pointer py-3 font-semibold">Format & timing</summary>
      <form className="mt-3 flex flex-wrap items-end gap-4" onSubmit={event => {
        event.preventDefault(); const data = new FormData(event.currentTarget);
        save({ start: `2026-10-16T${data.get('start')}:00+04:00`, end: `2026-10-16T${data.get('end')}:00+04:00`, heatMinutes: Number(data.get('heat')), changeoverMinutes: Number(data.get('change')), regroupMinutes: Number(data.get('regroup')), seedAfter: Number(data.get('seed')) as 1 | 2 });
      }}>
        <fieldset disabled={busy || state.heats.length > 0} className="flex flex-wrap items-end gap-4">
          <label className="grid gap-1 text-sm">First heat<input className={input} type="time" name="start" required defaultValue={cupTime(plan.start)} /></label>
          <label className="grid gap-1 text-sm">Finish by<input className={input} type="time" name="end" required defaultValue={cupTime(plan.end)} /></label>
          {([['heat', 'Heat minutes', plan.heatMinutes, 5, 30], ['change', 'Changeover minutes', plan.changeoverMinutes, 1, 10], ['regroup', 'Between rounds (extra minutes)', plan.regroupMinutes, 3, 15]] as const).map(([name,label,value,min,max]) => <label key={name} className="grid gap-1 text-sm">{label}<input name={name} type="number" min={min} max={max} defaultValue={value} required className={`${input} max-w-24`} /></label>)}
          <label className="grid gap-1 text-sm">Group by scores after<select name="seed" defaultValue={plan.seedAfter} className={select}><option value="2">Round 2 (recommended)</option><option value="1">Round 1</option></select></label>
          <button className={primaryButton}>Save format & timetable</button>
        </fieldset>
      </form>
      {!!state.heats.length && <p className="mt-3 text-sm">Timing and format are locked after drawing. Unstarted draws can be deleted from the last round backwards.</p>}
    </details>
    <p role="status" className={`rounded-xl border p-4 ${table.spareMinutes < 0 ? 'border-red-500 bg-red-500/10' : 'border-line bg-surface'}`}><strong>{state.entrants.length} kids · {table.rows.length} heats · estimated finish {cupTime(table.finish)}</strong><br />{table.spareMinutes < 0 ? `${-table.spareMinutes} minutes over the finish time. Adjust the plan or entry count before drawing.` : `${table.spareMinutes} minutes spare, including ${plan.changeoverMinutes}-minute changeovers and ${plan.regroupMinutes}-minute regrouping breaks.`}{!state.config.plan && ' Preview only — save the format to use this schedule.'}</p>
    {state.config.plan && <div className="rounded-xl border border-line p-4">
      <h3 className="font-bold">Next step</h3>
      <p className="my-2 text-sm">{remaining ? `Round ${remaining}: ${state.heats.some(h => h.stage === 'round' && h.round === remaining) ? 'review the surfers, select judges, then run each heat in order.' : remaining > plan.seedAfter ? 'review the completed scores, then draw the groups by level.' : 'draw shuffled heats and review the pairings.'}` : !finalDrawn ? 'Review qualifying scores and any boundary ties, then build every placement final.' : 'Run placement finals in timetable order. The Cup final is last.'}</p>
      <button className={smallButton} type="button" onClick={() => chooseRound(remaining ?? 'final')}>Go to {remaining ? `round ${remaining}` : 'finals'}</button>
    </div>}
    <details><summary className="cursor-pointer py-3 font-semibold">Fair scoring & organiser checklist</summary><div className="grid gap-3 text-sm leading-relaxed">
      <p>Use the same 1–5 star standard for everyone, ideally the same two or more judges throughout. Agree run numbers and average judges for each run; average the best two runs for the heat. A single scored run stands alone. A completed heat with no scored run counts as zero: check missing scores before finishing.</p>
      <p>Qualifying is the average of all three heat scores, not finishing places. Only completed heats count. A stronger group cannot knock a child out; anyone can reach the Cup final on their scores. Best individual qualifying run breaks an equal average. If that is tied at a final-group boundary, record a surf-off or head-judge review below. Never choose by name or a random draw.</p>
      <p>Final scores decide places within that final group; qualifying average, then best qualifying run break ties. If those remain equal, the result is shared. A lower-group final cannot overtake the Cup finalists. Review conditions and judge consistency between rounds: grouping alone cannot remove judging or wave-condition differences.</p>
      <p>Check the roster and waivers before drawing. Keep one heat in the water, and use regrouping breaks to check scores and announce the next draw. Swaps are allowed only before a heat starts. Final groups follow scores and cannot be manually promoted.</p>
    </div></details>
    {state.config.plan && finalsReady && !finalDrawn && <div className="grid gap-3 border-t border-line pt-4">
      <h3 className="font-bold">Review final groups</h3>
      <p className="text-sm">{tied.length ? 'A tie crosses a group boundary. Use the arrows to order tied surfers, then record how the decision was reached. Equal scores within one group need no decision.' : 'No boundary ties. Every surfer has three completed heats.'}</p>
      <ol className="grid gap-2">{sorted.map((row, i) => <li key={row.kidId} className="flex flex-wrap items-center gap-2 text-sm"><strong>{i + 1}. {row.name}</strong><span>{row.total} ★ · {i < 4 ? 'Cup final' : `Placement final ${Math.floor(i / 4) + 1}`}</span>{tied.includes(row.rank) && <><button type="button" className={smallButton} aria-label={`Move ${row.name} up in tie review`} disabled={busy || i === 0 || sorted[i - 1].rank !== row.rank} onClick={() => swap(i, -1)}>↑</button><button type="button" className={smallButton} aria-label={`Move ${row.name} down in tie review`} disabled={busy || i === sorted.length - 1 || sorted[i + 1].rank !== row.rank} onClick={() => swap(i, 1)}>↓</button></>}</li>)}</ol>
      {!!tied.length && <label className="grid gap-2 text-sm">Tie decision and reason<textarea className={input} minLength={10} maxLength={500} value={reason} onChange={e => setReason(e.target.value)} placeholder="Record the surf-off result or head-judge decision…" /></label>}
      <button type="button" className={primaryButton} disabled={busy || (!!tied.length && reason.trim().length < 10)} onClick={() => buildFinals(tied.length ? { order: sorted.map(row => row.kidId), reason } : undefined)}>Confirm & build placement finals</button>
    </div>}
    {state.config.finalReview && <p className="text-sm"><strong>Recorded tie decision:</strong> {state.config.finalReview.reason}</p>}
    <div className="grid gap-3 border-t border-line pt-4"><h3 className="font-bold">Heat timetable</h3>
      <label className="grid max-w-xs gap-1 text-sm">Find a surfer’s heats<select className={select} value={kid} onChange={e => setKid(e.target.value)}><option value="">All surfers</option>{state.entrants.map(k => <option key={k.id} value={k.id}>{k.name}</option>)}</select></label>
      <p className="text-sm text-fg-muted">Estimated times in Mauritius. Later pairings appear after the previous round is complete. Delays in started heats carry through the remaining timetable.</p>
      <ol className="grid gap-2">{table.rows.filter(row => !kid || row.slots.some(slot => slot.kidId === kid) || !row.heatId).map(row => <li key={row.key} className="grid gap-2 rounded-xl border border-line p-3 sm:grid-cols-[7rem_10rem_1fr]">
        <p className="font-mono text-sm">{cupTime(row.start)}–{cupTime(row.end)}</p>
        <button type="button" className="text-left text-sm font-semibold underline underline-offset-4" onClick={() => chooseRound(row.stage === 'final' ? 'final' : row.round)}>{row.label}<span className="block text-xs font-normal no-underline">{row.status === 'pending' ? 'Draw pending' : row.status}</span></button>
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm">{row.slots.length ? row.slots.map(slot => <a key={slot.kidId} className="underline underline-offset-4" href={`/gallery/duckies/${slot.kidId}`}>{names.get(slot.kidId)} · {slot.colour}</a>) : <span className="text-fg-muted">{row.stage === 'final' ? `Qualifying places ${(row.number - 1) * 4 + 1}–${Math.min(row.number * 4, state.entrants.length)}` : 'Surfers assigned when this round is drawn'}</span>}</div>
      </li>)}</ol>
    </div>
  </section>;
}
