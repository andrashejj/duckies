import type { Semester } from "./semesters";
import type { OrganiserKid } from "./records";
import { CUP_ENTRY_FEE_MUR, CUP_LABEL, isCupTerm } from "./cup";
import { ctaClass } from "../ui";
import { duckieActions, duckieBox, duckieDetails, duckieFacts, duckiePhotoForm, duckieShare, textButton } from "../members-ui";
const text = (tag: string, value: string) => {
  const element = document.createElement(tag);
  element.textContent = value;
  return element;
};
function link(label: string, href: string) {
  const a = document.createElement("a");
  a.textContent = label;
  a.href = href;
  a.className = textButton;
  return a;
}
function button(label: string, action: () => unknown) {
  const b = document.createElement("button");
  b.type = "button";
  b.textContent = label;
  b.className = textButton;
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
  semester: Semester,
  reload: () => Promise<void>,
  report: (message: string) => void,
) {
  const section = document.createElement("div");
  section.className = duckieDetails;
  const facts = document.createElement("dl");
  facts.className = duckieFacts;
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
  fact(
    "Swimming · reef · gear",
    r
      ? r.reef
        ? "All acknowledged"
        : "Swimming + gear acknowledged (signed before reef sessions were added)"
      : "Not acknowledged",
  );
  fact("Medical notes", r ? r.medicalNotes || "None reported" : "Not supplied");
  fact(
    "Training rhythm",
    r
      ? r.sessionsPerWeek === "2"
        ? "Twice a week · Monday + Friday"
        : r.sessionsPerWeek === "1"
          ? "Once a week"
          : kid.cup && !kid.cup.member
            ? "None · cup entry only"
            : "Not chosen (older form)"
      : "Not supplied",
  );
  const paid = kid.payment?.status === "paid";
  fact(
    `Payment · ${semester.label}`,
    kid.payment
      ? `${paid ? "Paid" : "Unpaid"}${kid.payment.amountMur === null ? " · amount not recorded" : ` · Rs ${kid.payment.amountMur}`} · ${kid.payment.note}`
      : "Pending · no payment recorded for this semester",
  );
  // Membership is the signed registration plus the current semester paid —
  // whatever term the roster is showing right now.
  fact(
    "Membership",
    kid.memberPaid
      ? "Member · registered and current semester paid"
      : kid.waiverId
        ? "Pending · registered, current semester not paid"
        : "Pending · registration not signed yet",
  );
  if (kid.cup)
    fact(
      CUP_LABEL,
      `${
        kid.memberPaid
          ? "Club member · free entry"
          : kid.cup.member || (kid.waiverTerm && !isCupTerm(kid.waiverTerm))
            ? `Club registration on file, semester unpaid · Rs ${CUP_ENTRY_FEE_MUR} entry unless the semester is paid first`
            : `Cup-only · Rs ${CUP_ENTRY_FEE_MUR} entry${kid.waiverTerm && isCupTerm(kid.waiverTerm) ? "" : " · cup form not signed yet"}`
      } · registered ${new Date(kid.cup.createdAt).toLocaleDateString()} · ${kid.cup.contactName} · ${kid.cup.contactPhone}`,
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
        ? new Date(kid.link.expiresAt) < new Date()
          ? "Completed"
          : `Completed · family can still correct it until ${new Date(kid.link.expiresAt).toLocaleDateString()}`
        : new Date(kid.link.expiresAt) < new Date()
          ? "Expired — generate a new link"
          : `Pending · expires ${new Date(kid.link.expiresAt).toLocaleDateString()}`
      : "Not issued — generate and send the link",
  );
  section.append(facts);
  // Sign-in access is approved by hand, guardian by guardian. Payment never
  // grants it on its own.
  if (r) {
    const access = document.createElement("div");
    access.className = duckieBox;
    access.append(text("h3", "Sign-in access"));
    access.append(text("p", "Approved guardians can sign in, see the lineup and register this kid for the Cup."));
    for (const guardian of r.guardians) {
      const email = guardian.email.toLowerCase();
      const approved = (kid.approvedGuardians ?? []).includes(email);
      const row = document.createElement("div");
      row.className = duckieActions;
      row.append(text("span", `${guardian.name} · ${email} · ${approved ? "can sign in" : "no access"}`));
      row.append(
        button(approved ? "Revoke sign-in" : "Approve sign-in", async () => {
          try {
            await api(approved ? `/api/members?email=${encodeURIComponent(email)}` : "/api/members", approved ? "DELETE" : "POST", approved ? undefined : { email });
            await reload();
            report(approved ? `${email} can no longer sign in.` : `${email} can sign in now.`);
          } catch (error) {
            report(error instanceof Error ? error.message : "Couldn't change sign-in access.");
          }
        }),
      );
      access.append(row);
    }
    section.append(access);
  }
  const actions = document.createElement("div");
  actions.className = duckieActions;
  const share = document.createElement("div");
  share.className = duckieShare;
  share.hidden = true;
  // Registration comes first; the link goes out whether or not the fee is in yet.
  const generate = button("Generate registration link", async () => {
    generate.disabled = true;
    try {
      const data = await api(
        `/api/kids/${kid.id}/link?term=${encodeURIComponent(semester.id)}`,
        "POST",
      );
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
      const message = paid
        ? `Hi! Thanks for paying ${kid.name}'s Sunset Duckies membership. Please complete and sign the registration here: ${data.url}\nNo login needed. This link is private and expires in 14 days — you can also use it to correct any details after signing.`
        : `Hi! Here is ${kid.name}'s Sunset Duckies registration: ${data.url}\nNo login needed — fill it in and sign, about five minutes. The place is confirmed once the semester fee is paid. This link is private and expires in 14 days; you can also use it to correct any details after signing.`;
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
      await api(
        `/api/kids/${kid.id}/link?term=${encodeURIComponent(semester.id)}`,
        "DELETE",
      );
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
  history.className = duckieBox;
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
          row.className = duckieActions;
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
    payment.className = duckieBox;
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
    save.className = ctaClass();
    save.textContent = "Save payment status";
    payment.append(
      statusLabel,
      amountLabel,
      noteLabel,
      text(
        "p",
        `Applies to ${semester.label}. Fees: Rs ${semester.childFeeMur} per child / Rs ${semester.familyFeeMur} per family. Amount is the total recorded for this child or the attributed family payment; explain shared payments in the note.`,
      ),
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
          term: semester.id,
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
  const photo = document.createElement("form");
  photo.className = duckiePhotoForm;
  const photoLabel = text("label", "Profile photo");
  const file = document.createElement("input");
  file.type = "file";
  file.accept = "image/jpeg,image/png,image/webp";
  photoLabel.append(file);
  const upload = document.createElement("button");
  upload.type = "submit";
  upload.className = textButton;
  upload.textContent = "Upload photo";
  photo.append(
    photoLabel,
    text(
      "p",
      "Private to organisers. JPEG, PNG or WebP, up to 4 MB / 20 megapixels. Uploading does not grant permission to publish.",
    ),
    upload,
  );
  if (kid.photoVersion)
    photo.append(
      button("Remove photo", async () => {
        try {
          await api(`/api/kids/${kid.id}/photo`, "DELETE");
          await reload();
          report("Profile photo removed.");
        } catch (e) {
          report(String(e));
        }
      }),
    );
  photo.onsubmit = async (event) => {
    event.preventDefault();
    const selected = file.files?.[0];
    if (!selected) {
      report("Choose a photo first.");
      return;
    }
    if (selected.size > 4 * 1024 * 1024) {
      report("Choose a photo smaller than 4 MB.");
      return;
    }
    upload.disabled = true;
    try {
      const response = await fetch(`/api/kids/${kid.id}/photo`, {
        method: "PUT",
        headers: { "Content-Type": selected.type },
        body: selected,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      await reload();
      report("Private profile photo saved.");
    } catch (e) {
      report(e instanceof Error ? e.message : "Photo upload failed.");
    } finally {
      upload.disabled = false;
    }
  };
  section.append(photo);
  return section;
}
