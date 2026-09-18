import { useId } from "react";
import { pouchSvg, type PouchDesign } from "../../lib/granola-pouch";

// The pack card's pouch on the simulator's dark board: the printed design for
// the three flavours, the blank "?" pouch for a recipe of the editor's own.
export default function GranolaPouch({ design, name, grams }: { design: PouchDesign; name: string; grams: number }) {
  const uid = useId().replace(/:/g, "");
  return <span className="relative flex h-[250px] w-full items-center justify-center overflow-hidden bg-slate-800 bg-[linear-gradient(color-mix(in_oklab,var(--color-bone)_3%,transparent)_1px,transparent_1px),linear-gradient(90deg,color-mix(in_oklab,var(--color-bone)_3%,transparent)_1px,transparent_1px)] bg-[size:32px_32px] max-[800px]:h-[210px] max-[520px]:h-[188px] [&>svg]:h-[236px] [&>svg]:w-auto [&>svg]:transition-transform [&>svg]:duration-200 group-hover:[&>svg]:-translate-y-1 motion-reduce:[&>svg]:transition-none motion-reduce:group-hover:[&>svg]:translate-y-0 max-[800px]:[&>svg]:h-[196px] max-[520px]:[&>svg]:h-[176px]" aria-hidden="true"
    dangerouslySetInnerHTML={{ __html: pouchSvg(design, { name, grams, id: `pouch-${uid}` }) }} />;
}
