import { formatScore, type Standing } from "../../lib/comp";
import { boardTable, mono, podium, rankBubble } from "../../lib/comp-ui";

// The leaderboard table, shared by the organiser board and the public live
// page: rank, surfer, a column per round, the total, and the final apart.
export function Leaderboard({ rows, rounds, publicView = false }: { rows: (Omit<Standing, "kidId"> & { kidId?: string })[]; rounds: number; publicView?: boolean }) {
  if (!rows.length) return <p className={`${mono} mt-4`}>Nobody in the draw yet.</p>;
  return (
    <table className={`${boardTable} mt-4`}>
      <thead>
        <tr>
          <th scope="col">#</th><th scope="col">Surfer</th><th scope="col" className="max-sm:hidden">Age</th>
          {Array.from({ length: rounds }, (_, i) => <th key={i} scope="col" className="text-right">R{i + 1}</th>)}
          <th scope="col" className="text-right">Best 2 avg ★</th><th scope="col" className="text-right">Final</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.kidId ?? row.name} className={row.rank <= 3 && row.total > 0 ? "font-semibold" : ""}>
            <td><span className={`${rankBubble} ${row.total > 0 ? podium[row.rank] ?? "" : "opacity-50"}`}>{row.rank}</span></td>
            <td className="font-display text-[1rem] font-bold [font-variation-settings:'wdth'_108]">{row.name}</td>
            <td className="max-sm:hidden">{row.age ?? "—"}</td>
            {row.rounds.map((score, index) => <td key={index} className="text-right font-mono">{formatScore(score)}</td>)}
            <td className="text-right font-display text-[1.05rem] font-extrabold">{formatScore(row.total)}</td>
            <td className="text-right font-mono">{row.final === null ? (publicView ? "" : "—") : formatScore(row.final)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
