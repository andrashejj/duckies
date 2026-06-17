import { useState } from "react";

import { COLORWAY_OPTIONS } from "../../lib/product-admin";

type ProductFormValues = {
  id?: string;
  sku: string;
  slug: string;
  name: string;
  kind: string;
  tagline: string;
  description: string;
  price: string; // rupees, human-facing
  currency: string;
  category:
    | "APPAREL"
    | "HEADWEAR"
    | "ACCESSORIES"
    | "BOARD_CARE"
    | "STATIONERY"
    | "BUNDLE";
  sizes: string; // comma-separated
  colorway: (typeof COLORWAY_OPTIONS)[number];
  imageUrl: string;
  imageAlt: string;
  active: boolean;
  featured: boolean;
  stock: string; // empty string = untracked
  sortOrder: string;
  dropId: string; // empty string = none
};

const CATEGORIES: ProductFormValues["category"][] = [
  "APPAREL",
  "HEADWEAR",
  "ACCESSORIES",
  "BOARD_CARE",
  "STATIONERY",
  "BUNDLE",
];

type Props = {
  mode: "create" | "edit";
  initial?: ProductFormValues;
  drops: { id: string; name: string }[];
};

const EMPTY: ProductFormValues = {
  sku: "",
  slug: "",
  name: "",
  kind: "",
  tagline: "",
  description: "",
  price: "",
  currency: "MUR",
  category: "APPAREL",
  sizes: "",
  colorway: "ink",
  imageUrl: "",
  imageAlt: "",
  active: true,
  featured: false,
  stock: "",
  sortOrder: "0",
  dropId: "",
};

export default function ProductForm({ mode, initial, drops }: Props) {
  const [values, setValues] = useState<ProductFormValues>(initial ?? EMPTY);
  const [submitting, setSubmitting] = useState<"save" | "delete" | null>(null);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof ProductFormValues>(
    key: K,
    value: ProductFormValues[K],
  ) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting("save");
    try {
      const priceNum = Number.parseFloat(values.price);
      if (Number.isNaN(priceNum) || priceNum < 0) {
        setError("Price must be a non-negative number.");
        setSubmitting(null);
        return;
      }
      const stockRaw = values.stock.trim();
      const stock =
        stockRaw === "" ? null : Number.parseInt(stockRaw, 10);
      if (stock !== null && (Number.isNaN(stock) || stock < 0)) {
        setError("Stock must be a non-negative integer, or empty for untracked.");
        setSubmitting(null);
        return;
      }
      const sortOrder = Number.parseInt(values.sortOrder, 10);
      if (Number.isNaN(sortOrder) || sortOrder < 0) {
        setError("Sort order must be a non-negative integer.");
        setSubmitting(null);
        return;
      }

      const payload = {
        sku: values.sku.trim(),
        slug: values.slug.trim().toLowerCase(),
        name: values.name.trim(),
        kind: values.kind.trim(),
        tagline: values.tagline.trim() || null,
        description: values.description.trim(),
        priceCents: Math.round(priceNum * 100),
        currency: values.currency.trim().toUpperCase(),
        category: values.category,
        sizes: values.sizes
          .split(/[,\n]/)
          .map((s) => s.trim())
          .filter(Boolean),
        colorway: values.colorway,
        imageUrl: values.imageUrl.trim() || null,
        imageAlt: values.imageAlt.trim() || null,
        active: values.active,
        featured: values.featured,
        stock,
        sortOrder,
        dropId: values.dropId.trim() || null,
      };

      const url =
        mode === "edit" && values.id
          ? `/api/admin/products/${values.id}`
          : "/api/admin/products";
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
      window.location.href = "/admin/products";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed.");
      setSubmitting(null);
    }
  }

  async function handleArchive() {
    if (!values.id) return;
    if (!window.confirm("Archive this product? It'll stop showing in the shop.")) return;
    setSubmitting("delete");
    try {
      const res = await fetch(`/api/admin/products/${values.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error ?? "Archive failed.");
        setSubmitting(null);
        return;
      }
      window.location.href = "/admin/products";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed.");
      setSubmitting(null);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[1.4fr_0.9fr]">
      <div className="space-y-5">
        <fieldset className="surface-card space-y-4 p-5">
          <legend className="section-kicker">Identity</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name" value={values.name} onChange={(v) => update("name", v)} required />
            <Field label="Kind (display)" value={values.kind} onChange={(v) => update("kind", v)} placeholder="Tee · Hoodie · Accessories" required />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="SKU" value={values.sku} onChange={(v) => update("sku", v)} required />
            <Field label="Slug (url)" value={values.slug} onChange={(v) => update("slug", v)} required placeholder="duckies-tee" />
          </div>
          <Field label="Tagline" value={values.tagline} onChange={(v) => update("tagline", v)} placeholder="Short-line under the title" />
          <TextArea label="Description" value={values.description} onChange={(v) => update("description", v)} required rows={4} />
        </fieldset>

        <fieldset className="surface-card space-y-4 p-5">
          <legend className="section-kicker">Pricing + stock</legend>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field
              label={`Price (${values.currency})`}
              value={values.price}
              onChange={(v) => update("price", v)}
              required
              placeholder="850"
              inputMode="decimal"
            />
            <Field label="Currency" value={values.currency} onChange={(v) => update("currency", v)} />
            <Field
              label="Stock (blank = untracked)"
              value={values.stock}
              onChange={(v) => update("stock", v)}
              placeholder="12"
              inputMode="numeric"
            />
          </div>
        </fieldset>

        <fieldset className="surface-card space-y-4 p-5">
          <legend className="section-kicker">Image</legend>
          <Field
            label="Image URL (drop into /public/media/shop/ first)"
            value={values.imageUrl}
            onChange={(v) => update("imageUrl", v)}
            placeholder="/media/shop/duckies-tee.png"
          />
          <TextArea
            label="Alt text (one good sentence describing the photo)"
            value={values.imageAlt}
            onChange={(v) => update("imageAlt", v)}
            placeholder="Cream cotton tee on a duck-yellow background, sunset duck-in-cap badge on the chest."
            rows={2}
          />
          {values.imageUrl && (
            <div className="overflow-hidden rounded-[1rem] border-2 border-[var(--color-ink-950)] bg-[var(--color-cream-deep)] shadow-[3px_3px_0_0_var(--color-ink-950)]">
              <img
                src={values.imageUrl}
                alt={values.imageAlt || "Preview"}
                className="block aspect-[4/3] w-full object-cover"
              />
            </div>
          )}
        </fieldset>

        <fieldset className="surface-card space-y-4 p-5">
          <legend className="section-kicker">Display</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Category"
              value={values.category}
              onChange={(v) => update("category", v as ProductFormValues["category"])}
              options={CATEGORIES}
            />
            <Select
              label="Colourway"
              value={values.colorway}
              onChange={(v) => update("colorway", v as ProductFormValues["colorway"])}
              options={[...COLORWAY_OPTIONS]}
            />
          </div>
          <TextArea
            label="Sizes (comma or newline separated)"
            value={values.sizes}
            onChange={(v) => update("sizes", v)}
            placeholder="Kids 4-14, Adult XS-XXL"
            rows={2}
          />
          <Field label="Sort order" value={values.sortOrder} onChange={(v) => update("sortOrder", v)} inputMode="numeric" />
          <label className="block font-mono text-[0.64rem] uppercase tracking-[0.16em] text-[var(--color-ink-950)]/75">
            <span>Drop</span>
            <select
              value={values.dropId}
              onChange={(e) => update("dropId", e.target.value)}
              className="mt-2 w-full rounded-[0.6rem] border-2 border-[var(--color-ink-950)] bg-[var(--color-cream-soft)] px-3 py-2 font-sans text-sm text-[var(--color-ink-950)] shadow-[2px_2px_0_0_var(--color-ink-950)] focus:outline-none focus:ring-2 focus:ring-[var(--color-coral-500)]"
            >
              <option value="">— No drop (always-on) —</option>
              {drops.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </label>
          <div className="flex flex-wrap gap-4">
            <Checkbox label="Active (visible in shop)" checked={values.active} onChange={(v) => update("active", v)} />
            <Checkbox label="Featured (highlighted)" checked={values.featured} onChange={(v) => update("featured", v)} />
          </div>
        </fieldset>
      </div>

      <aside className="sticky top-6 h-fit space-y-4">
        <div className="surface-card space-y-3 p-5">
          <p className="section-kicker">Save</p>
          {error && (
            <p className="rounded-[0.6rem] border border-[var(--color-coral-500)] bg-[var(--color-coral-500)]/10 p-3 font-mono text-[0.72rem] uppercase tracking-[0.14em] text-[var(--color-coral-500)]">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={submitting !== null}
            className="cta-primary w-full justify-center disabled:opacity-60"
          >
            {submitting === "save"
              ? "Saving…"
              : mode === "edit"
                ? "Save changes"
                : "Create product"}
          </button>
          {mode === "edit" && (
            <button
              type="button"
              onClick={handleArchive}
              disabled={submitting !== null}
              className="w-full rounded-full border-2 border-[var(--color-coral-500)] bg-transparent px-4 py-2 font-mono text-[0.72rem] uppercase tracking-[0.18em] text-[var(--color-coral-500)] hover:bg-[var(--color-coral-500)] hover:text-[var(--color-cream-soft)] disabled:opacity-60"
            >
              {submitting === "delete" ? "Archiving…" : "Archive product"}
            </button>
          )}
          <a href="/admin/products" className="block text-center font-mono text-[0.7rem] uppercase tracking-[0.2em] text-[var(--color-ink-950)]/60 hover:text-[var(--color-coral-500)]">
            Cancel
          </a>
        </div>
      </aside>
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
    <label className="block font-mono text-[0.64rem] uppercase tracking-[0.16em] text-[var(--color-ink-950)]/75">
      <span>
        {label}
        {required && <span className="ml-1 text-[var(--color-coral-500)]">*</span>}
      </span>
      <input
        type="text"
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
        className="mt-2 w-full rounded-[0.6rem] border-2 border-[var(--color-ink-950)] bg-[var(--color-cream-soft)] px-3 py-2 font-sans text-sm text-[var(--color-ink-950)] shadow-[2px_2px_0_0_var(--color-ink-950)] focus:outline-none focus:ring-2 focus:ring-[var(--color-coral-500)]"
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
    <label className="block font-mono text-[0.64rem] uppercase tracking-[0.16em] text-[var(--color-ink-950)]/75">
      <span>
        {label}
        {required && <span className="ml-1 text-[var(--color-coral-500)]">*</span>}
      </span>
      <textarea
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="mt-2 w-full rounded-[0.8rem] border-2 border-[var(--color-ink-950)] bg-[var(--color-cream-soft)] p-3 font-sans text-sm text-[var(--color-ink-950)] shadow-[2px_2px_0_0_var(--color-ink-950)] focus:outline-none focus:ring-2 focus:ring-[var(--color-coral-500)]"
      />
    </label>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <label className="block font-mono text-[0.64rem] uppercase tracking-[0.16em] text-[var(--color-ink-950)]/75">
      <span>{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 w-full rounded-[0.6rem] border-2 border-[var(--color-ink-950)] bg-[var(--color-cream-soft)] px-3 py-2 font-sans text-sm text-[var(--color-ink-950)] shadow-[2px_2px_0_0_var(--color-ink-950)] focus:outline-none focus:ring-2 focus:ring-[var(--color-coral-500)]"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

function Checkbox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 font-mono text-[0.72rem] uppercase tracking-[0.14em] text-[var(--color-ink-950)]/75">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 accent-[var(--color-coral-500)]"
      />
      {label}
    </label>
  );
}
