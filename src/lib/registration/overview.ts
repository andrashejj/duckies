import type { OrganiserKid } from "./records";
const text = (tag: string, value: string) => {
  const element = document.createElement(tag);
  element.textContent = value;
  return element;
};
function link(label: string, href: string) {
  const a = document.createElement("a");
  a.textContent = label;
  a.href = href;
  a.className = "member-text-button";
  return a;
}
function button(label: string, action: () => unknown) {
  const b = document.createElement("button");
  b.type = "button";
  b.textContent = label;
  b.className = "member-text-button";
  b.onclick = () => void action();
  return b;
}
async function api(url: string, method = "GET", body?: unknown) {
  const response = await fetch(url, {
    method,
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? "Couldn't save this change.");
  return data;
}
export function kidOverview(
  kid: OrganiserKid,
  canPay: boolean,
  reload: () => Promise<void>,
  report: (message: string) => void,
) {
  const section = document.createElement("div");
  section.className = "duckie-details";
  const facts = document.createElement("dl");
  facts.className = "duckie-facts";
  function fact(label: string, value: string) {
    const group = document.createElement("div");
    group.append(text("dt", label), text("dd", value));
    facts.append(group);
  }
  const r = kid.registration;
  fact(
    "Age",
    r ? `${kid.age} years · born ${r.dateOfBirth}` : "Awaiting registration",
  );
  fact(
    "Legal guardians",
    r
      ? r.guardians
          .map((g) => `${g.name} (${g.relationship}) · ${g.phone} · ${g.email}`)
          .join("\n")
      : "Not supplied",
  );
  fact(
    "Emergency contact",
    r
      ? `${r.emergencyName} (${r.emergencyRelationship}) · ${r.emergencyPhone}`
      : "Not supplied",
  );
  fact(
    "Waiver",
    kid.signedAt
      ? `Signed ${new Date(kid.signedAt).toLocaleDateString()} by ${r!.signerName}`
      : "Not signed",
  );
  fact(
    "Photos + video",
    r
      ? r.media === "yes"
        ? "Consent given"
        : "NO CONSENT — exclude or blur"
      : "No choice recorded",
  );
  fact(
    "Parent in water",
    r?.parentInWater
      ? "Acknowledged for every full session"
      : "Not acknowledged",
  );
  fact("Swimming + gear", r ? "Both acknowledged" : "Not acknowledged");
  fact("Medical notes", r ? r.medicalNotes || "None reported" : "Not supplied");
  fact(
    "Rashie / membership",
    r ? `${r.rashieSize} · ${r.rashieName} · ${r.membership}` : "Not supplied",
  );
  fact(
    "Payment",
    kid.payment
      ? `${kid.payment.status === "paid" ? "Paid" : "Unpaid"}${kid.payment.amountMur === null ? " · amount not recorded" : ` · Rs ${kid.payment.amountMur}`} · ${kid.payment.note}`
      : "Not recorded",
  );
  if (kid.contactName || kid.contactPhone)
    fact(
      "Contact supplied to club",
      `${kid.contactName ?? ""} · ${kid.contactPhone ?? ""} (guardian details awaiting confirmation)`,
    );
  fact(
    "Registration invitation",
    kid.link
      ? kid.link.completedAt
        ? "Completed"
        : new Date(kid.link.expiresAt) < new Date()
          ? "Expired — generate a new link"
          : `Pending · expires ${new Date(kid.link.expiresAt).toLocaleDateString()}`
      : "Not issued",
  );
  section.append(facts);
  const actions = document.createElement("div");
  actions.className = "duckie-actions";
  const share = document.createElement("div");
  share.className = "duckie-share member-form";
  share.hidden = true;
  const generate = button("Generate registration link", async () => {
    generate.disabled = true;
    try {
      const data = await api(`/api/kids/${kid.id}/link`, "POST");
      share.replaceChildren();
      share.hidden = false;
      const label = text("label", "Private registration link");
      const input = document.createElement("input");
      input.readOnly = true;
      input.value = data.url;
      label.append(input);
      const copy = button("Copy link", async () => {
        try {
          await navigator.clipboard.writeText(data.url);
          report("Registration link copied.");
        } catch {
          input.focus();
          input.select();
          report("Select and copy the link above.");
        }
      });
      const phone = (r?.guardians[0].phone ?? kid.contactPhone ?? "").replace(
        /\D/g,
        "",
      );
      const message = `Hi! Please complete and sign ${kid.name}'s Sunset Duckies registration here: ${data.url}\nNo login needed. This link is private and expires in 14 days.`;
      const whatsapp = link(
        "Send via WhatsApp",
        `https://wa.me/${phone}?text=${encodeURIComponent(message)}`,
      );
      whatsapp.target = "_blank";
      whatsapp.rel = "noreferrer noopener";
      share.append(
        label,
        text(
          "p",
          "This replaces the previous invitation. Share it only with this child's legal guardian.",
        ),
        copy,
        whatsapp,
      );
      report("Private link generated. It expires in 14 days.");
    } catch (error) {
      report(
        error instanceof Error ? error.message : "Couldn't generate a link.",
      );
    } finally {
      generate.disabled = false;
    }
  });
  const revoke = button("Revoke registration link", async () => {
    try {
      await api(`/api/kids/${kid.id}/link`, "DELETE");
      await reload();
      report("Invitation revoked.");
    } catch (error) {
      report(String(error));
    }
  });
  actions.append(generate, revoke);
  if (kid.waiverId)
    actions.append(
      link("Download signed waiver", `/api/waivers/${kid.waiverId}`),
    );
  const history = document.createElement("div");
  history.className = "duckie-history member-form";
  history.hidden = true;
  actions.append(
    button("Signed records + payment history", async () => {
      if (!history.hidden) {
        history.hidden = true;
        return;
      }
      try {
        const data = await api(`/api/kids/${kid.id}/records`);
        history.replaceChildren();
        history.hidden = false;
        history.append(text("h3", "Signed records"));
        if (!data.waivers.length)
          history.append(text("p", "No signed records yet."));
        for (const w of data.waivers) {
          const row = document.createElement("div");
          row.className = "duckie-actions";
          row.append(
            link(
              `${w.term} · ${new Date(w.signed_at).toLocaleString()} · PDF`,
              `/api/waivers/${w.id}`,
            ),
            link("Signature record", `/api/waivers/${w.id}?format=audit`),
          );
          history.append(row);
        }
        history.append(text("h3", "Payment history"));
        if (!data.payments.length)
          history.append(text("p", "No payment recorded."));
        for (const p of data.payments)
          history.append(
            text(
              "p",
              `${p.term} · ${p.status} · ${p.amount_mur === null ? "amount not recorded" : `Rs ${p.amount_mur}`} · ${p.note} · ${p.actor_email} · ${new Date(p.recorded_at).toLocaleString()}`,
            ),
          );
      } catch (error) {
        report(String(error));
      }
    }),
  );
  section.append(actions, share, history);
  if (canPay) {
    const payment = document.createElement("form");
    payment.className = "member-form duckie-payment";
    payment.hidden = true;
    actions.append(
      button("Update payment", () => {
        payment.hidden = !payment.hidden;
      }),
    );
    const statusLabel = text("label", "Payment status");
    const select = document.createElement("select");
    select.name = "payment-status";
    for (const [value, label] of [
      ["paid", "Paid"],
      ["unpaid", "Unpaid"],
    ]) {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = label;
      select.append(option);
    }
    select.value = kid.payment?.status ?? "paid";
    statusLabel.append(select);
    const amountLabel = text("label", "Amount received (Rs, optional)");
    const amount = document.createElement("input");
    amount.type = "number";
    amount.min = "0";
    amount.max = "1000000";
    amount.step = "0.01";
    amount.value = kid.payment?.amountMur ?? "";
    amountLabel.append(amount);
    const noteLabel = text("label", "Payment note / reference");
    const note = document.createElement("input");
    note.required = true;
    note.maxLength = 1000;
    noteLabel.append(note);
    const save = document.createElement("button");
    save.type = "submit";
    save.className = "cta-primary";
    save.textContent = "Save payment status";
    payment.append(
      statusLabel,
      amountLabel,
      noteLabel,
      text(
        "p",
        "Only Andras can change this. Every change stays in the history.",
      ),
      save,
    );
    payment.onsubmit = async (event) => {
      event.preventDefault();
      save.disabled = true;
      try {
        await api(`/api/kids/${kid.id}/payment`, "POST", {
          status: select.value,
          amountMur: amount.value === "" ? null : Number(amount.value),
          note: note.value,
        });
        await reload();
        report("Payment status saved.");
      } catch (error) {
        report(
          error instanceof Error ? error.message : "Couldn't save payment.",
        );
      } finally {
        save.disabled = false;
      }
    };
    section.append(payment);
  }
  return section;
}
