import type { Semester } from "./semesters";
import { ctaClass } from "../ui";
import { semesterControls as semesterControlsClass, semesterForm, textButton } from "../members-ui";
export function semesterControls(
  terms: Semester[],
  selected: Semester,
  owner: boolean,
  change: (id: string) => Promise<void>,
  report: (text: string) => void,
) {
  const root = document.createElement("div");
  root.className = semesterControlsClass;
  const label = document.createElement("label");
  label.textContent = "Payment semester";
  const select = document.createElement("select");
  select.setAttribute("aria-label", "Payment semester");
  for (const term of terms) {
    const o = document.createElement("option");
    o.value = term.id;
    o.textContent = `${term.label}${term.isCurrent ? " · current" : ""}`;
    select.append(o);
  }
  select.value = selected.id;
  label.append(select);
  root.append(label);
  select.onchange = () => void change(select.value);
  const fee = document.createElement("p");
  fee.textContent = `Rs ${selected.childFeeMur} per child / Rs ${selected.familyFeeMur} per family. Each semester has its own payment status.`;
  root.append(fee);
  async function save(method: string, body: unknown) {
    const r = await fetch("/api/semesters", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error);
  }
  if (owner) {
    if (!selected.isCurrent) {
      const activate = document.createElement("button");
      activate.type = "button";
      activate.className = textButton;
      activate.textContent = "Make this the current semester";
      activate.onclick = async () => {
        activate.disabled = true;
        try {
          await save("PATCH", { id: selected.id });
          await change(selected.id);
          report("Current semester updated. Past payments have not changed.");
        } catch (e) {
          report(String(e));
          activate.disabled = false;
        }
      };
      root.append(activate);
    }
    const details = document.createElement("details");
    const summary = document.createElement("summary");
    summary.textContent = "Add a semester";
    details.append(summary);
    const form = document.createElement("form");
    form.className = semesterForm;
    for (const [name, title, type, value] of [
      ["id", "Semester ID", "text", ""],
      ["label", "Semester name", "text", ""],
      ["startsOn", "Start date (optional)", "date", ""],
      ["endsOn", "End date (optional)", "date", ""],
      [
        "childFeeMur",
        "Fee per child (Rs)",
        "number",
        String(selected.childFeeMur),
      ],
      [
        "familyFeeMur",
        "Fee per family (Rs)",
        "number",
        String(selected.familyFeeMur),
      ],
    ]) {
      const l = document.createElement("label");
      l.textContent = title;
      const i = document.createElement("input");
      i.name = name;
      i.type = type;
      i.value = value;
      i.required = !name.endsWith("On");
      if (type === "number") {
        i.min = "0";
        i.max = "1000000";
        i.step = ".01";
      } else if (type === "text") i.maxLength = name === "id" ? 40 : 100;
      l.append(i);
      form.append(l);
    }
    const button = document.createElement("button");
    button.type = "submit";
    button.className = ctaClass();
    button.textContent = "Create semester";
    form.append(button);
    form.onsubmit = async (e) => {
      e.preventDefault();
      button.disabled = true;
      const d = new FormData(form);
      const id = String(d.get("id"));
      try {
        await save("POST", {
          id,
          label: d.get("label"),
          startsOn: d.get("startsOn") || null,
          endsOn: d.get("endsOn") || null,
          childFeeMur: Number(d.get("childFeeMur")),
          familyFeeMur: Number(d.get("familyFeeMur")),
        });
        await change(id);
        report(
          "Semester created. Choose “Make this the current semester” when ready.",
        );
      } catch (e) {
        report(String(e));
        button.disabled = false;
      }
    };
    details.append(form);
    root.append(details);
  }
  return root;
}
