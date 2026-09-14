export function formatPrice(priceCents: number, currency = "MUR"): string {
  const whole = Math.round(priceCents / 100);
  const prefix = currency === "MUR" ? "Rs" : currency;
  return `${prefix} ${whole.toLocaleString("en-GB")}`;
}

export function shortOrderId(id: string): string {
  return id.slice(-6).toUpperCase();
}
