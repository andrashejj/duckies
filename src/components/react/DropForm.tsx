import { useHydrated } from "./useHydrated";
import { useState } from "react";

import { DROP_STATUS_VALUES } from "../../lib/drop-admin";
import { ctaClass, kickerClass, stickerCardClass } from "../../lib/ui";

type DropFormValues = {
  id?: string;
  slug: string;
  name: string;
  description: string;
  status: (typeof DROP_STATUS_VALUES)[number];
  opensAt: string; // datetime-local string
  closesAt: string; // datetime-local string
  pickupNote: string;
  sortOrder: string;
};

type Props = {
  mode: "create" | "edit";
  initial?: DropFormValues;
};

const EMPTY: DropFormValues = {
  slug: "",
  name: "",
  description: "",
  status: "DRAFT",
  opensAt: "",
  closesAt: "",
  pickupNote: "",
  sortOrder: "0",
};

export default function DropForm({ mode, initial }: Props) {
  const ready = useHydrated();
  const [values, setValues] = useState<DropFormValues>(initial ?? EMPTY);
  const [submitting, setSubmitting] = useState<"save" | "delete" | null>(null);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof DropFormValues>(
    key: K,
    value: DropFormValues[K],
  ) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting("save");
    try {
      const sortOrder = Number.parseInt(values.sortOrder, 10);
      if (Number.isNaN(sortOrder) || sortOrder < 0) {
        setError("Sort order must be a non-negative integer.");
        setSubmitting(null);
        return;
      }

      const payload = {
        slug: values.slug.trim().toLowerCase(),
        name: values.name.trim(),
        description: values.description.trim() || null,
        status: values.status,
        opensAt: values.opensAt ? new Date(values.opensAt).toISOString() : null,
        closesAt: values.closesAt
          ? new Date(values.closesAt).toISOString()
          : null,
        pickupNote: values.pickupNote.trim() || null,
        sortOrder,
      };

      const url =
        mode === "edit" && values.id
          ? `/api/admin/drops/${values.id}`
          : "/api/admin/drops";
      const method = mode === "edit" ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error ?? "Save failed.");
        setSubmitting(null);
        return;
      }
      window.location.href = "/admin/drops";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed.");
      setSubmitting(null);
    }
  }

  async function handleDelete() {
    if (!values.id) return;
    if (!window.confirm("Close this drop? Its products will stop accepting reservations.")) return;
    setSubmitting("delete");
    try {
      const res = await fetch(`/api/admin/drops/${values.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error ?? "Could not close the drop.");
        setSubmitting(null);
        return;
      }
      window.location.href = "/admin/drops";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed.");
      setSubmitting(null);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[1.4fr_0.9fr]">
      <fieldset disabled={!ready} className="contents">
      <div className="space-y-5">
        <fieldset className={stickerCardClass({ hover: false }, "space-y-4 p-5")}>
          <legend className={kickerClass()}>Identity</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name" value={values.name} onChange={(v) => update("name", v)} required placeholder="Drop 002 — Comp kit" />
            <Field label="Slug (url)" value={values.slug} onChange={(v) => update("slug", v)} required placeholder="drop-002" />
          </div>
          <TextArea
            label="Description (shown on /shop)"
            value={values.description}
            onChange={(v) => update("description", v)}
            rows={3}
            placeholder="Two paragraphs of 'why this drop, why now'…"
          />
        </fieldset>

        <fieldset className={stickerCardClass({ hover: false }, "space-y-4 p-5")}>
          <legend className={kickerClass()}>Status + windows</legend>
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="block font-mono text-[0.64rem] uppercase tracking-[0.16em] text-fg/75">
              <span>Status</span>
              <select
                value={values.status}
                onChange={(e) =>
                  update("status", e.target.value as DropFormValues["status"])
                }
                className="mt-2 w-full rounded-[0.6rem] border-2 border-edge bg-surface px-3 py-2 font-sans text-sm text-fg shadow-sticker-xs focus:outline-none focus:ring-2 focus:ring-coral-500"
              >
                {DROP_STATUS_VALUES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <DateTimeField
              label="Opens at (optional)"
              value={values.opensAt}
              onChange={(v) => update("opensAt", v)}
            />
            <DateTimeField
              label="Closes at (optional)"
              value={values.closesAt}
              onChange={(v) => update("closesAt", v)}
            />
          </div>
          <TextArea
            label="Pickup note (shown to reservers)"
            value={values.pickupNote}
            onChange={(v) => update("pickupNote", v)}
            rows={2}
            placeholder="Pickup at next Mon/Fri sesh in Tamarin."
          />
          <Field label="Sort order" value={values.sortOrder} onChange={(v) => update("sortOrder", v)} inputMode="numeric" />
        </fieldset>
      </div>

      <aside className="sticky top-6 h-fit space-y-4">
        <div className={stickerCardClass({ hover: false }, "space-y-3 p-5")}>
          <p className={kickerClass()}>Save</p>
          {error && (
            <p className="rounded-[0.6rem] border border-coral-500 bg-coral-500/10 p-3 font-mono text-[0.72rem] uppercase tracking-[0.14em] text-coral-500">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={submitting !== null}
            className={ctaClass("primary", "md", "w-full")}
          >
            {submitting === "save"
              ? "Saving…"
              : mode === "edit"
                ? "Save changes"
                : "Create drop"}
          </button>
          {mode === "edit" && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={submitting !== null}
              className="w-full rounded-full border-2 border-coral-500 bg-transparent px-4 py-2 font-mono text-[0.72rem] uppercase tracking-[0.18em] text-coral-500 hover:bg-coral-500 hover:text-cream-soft disabled:opacity-60"
            >
              {submitting === "delete" ? "Closing…" : "Close drop"}
            </button>
          )}
          <a href="/admin/drops" className="block text-center font-mono text-[0.7rem] uppercase tracking-[0.2em] text-fg/60 hover:text-coral-500">
            Cancel
          </a>
        </div>
      </aside>
      </fieldset>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  required,
  placeholder,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  placeholder?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
}) {
  return (
    <label className="block font-mono text-[0.64rem] uppercase tracking-[0.16em] text-fg/75">
      <span>
        {label}
        {required && <span className="ml-1 text-coral-500">*</span>}
      </span>
      <input
        type="text"
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
        className="mt-2 w-full rounded-[0.6rem] border-2 border-edge bg-surface px-3 py-2 font-sans text-sm text-fg shadow-sticker-xs focus:outline-none focus:ring-2 focus:ring-coral-500"
      />
    </label>
  );
}

function DateTimeField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block font-mono text-[0.64rem] uppercase tracking-[0.16em] text-fg/75">
      <span>{label}</span>
      <input
        type="datetime-local"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 w-full rounded-[0.6rem] border-2 border-edge bg-surface px-3 py-2 font-sans text-sm text-fg shadow-sticker-xs focus:outline-none focus:ring-2 focus:ring-coral-500"
      />
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange,
  required,
  placeholder,
  rows = 3,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <label className="block font-mono text-[0.64rem] uppercase tracking-[0.16em] text-fg/75">
      <span>
        {label}
        {required && <span className="ml-1 text-coral-500">*</span>}
      </span>
      <textarea
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="mt-2 w-full rounded-[0.8rem] border-2 border-edge bg-surface p-3 font-sans text-sm text-fg shadow-sticker-xs focus:outline-none focus:ring-2 focus:ring-coral-500"
      />
    </label>
  );
}
