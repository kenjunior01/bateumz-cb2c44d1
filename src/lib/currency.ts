/**
 * Money formatting for North American markets (USD/CAD).
 * Legacy `formatMZN` is kept as an alias to `formatUSD` so old imports keep working.
 */

export type SupportedCurrency = "USD" | "CAD";

export function formatMoney(value: number, currency: SupportedCurrency = "USD"): string {
  const locale = currency === "CAD" ? "en-CA" : "en-US";
  return value.toLocaleString(locale, { style: "currency", currency });
}

export function formatUSD(value: number): string {
  return formatMoney(value, "USD");
}

export function formatCAD(value: number): string {
  return formatMoney(value, "CAD");
}

/** @deprecated Use formatMoney / formatUSD. Kept for backwards compatibility. */
export function formatMZN(value: number): string {
  return formatUSD(value);
}
