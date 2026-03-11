/**
 * Format a number as Mozambican Metical (MZN).
 */
export function formatMZN(value: number): string {
  return value.toLocaleString("pt-MZ", { style: "currency", currency: "MZN" });
}
