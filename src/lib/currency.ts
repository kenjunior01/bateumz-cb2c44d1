/**
 * Currency formatting utilities for Bateu.
 * Supports MZN (Mozambique), EUR (Portugal), BRL (Brazil), AOA (Angola), USD and CAD.
 */

export type SupportedCurrency = "USD" | "CAD" | "MZN" | "EUR" | "BRL" | "AOA" | "INR" | "GBP";

export function formatMoney(amount: number, currency: SupportedCurrency = "MZN"): string {
  const locales: Record<SupportedCurrency, string> = {
    USD: "en-US",
    CAD: "en-CA",
    MZN: "pt-MZ",
    EUR: "pt-PT",
    BRL: "pt-BR",
    AOA: "pt-AO",
    INR: "en-IN",
    GBP: "en-GB",
  };

  return new Intl.NumberFormat(locales[currency] || "pt-MZ", {
    style: "currency",
    currency: currency,
  }).format(amount);
}

export function formatMZN(amount: number): string {
  return formatMoney(amount, "MZN");
}

export function formatEUR(amount: number): string {
  return formatMoney(amount, "EUR");
}

export function formatBRL(amount: number): string {
  return formatMoney(amount, "BRL");
}

export function formatAOA(amount: number): string {
  return formatMoney(amount, "AOA");
}

export function formatUSD(amount: number): string {
  return formatMoney(amount, "USD");
}

export function formatCAD(amount: number): string {
  return formatMoney(amount, "CAD");
}

export function formatINR(amount: number): string {
  return formatMoney(amount, "INR");
}

export function formatGBP(amount: number): string {
  return formatMoney(amount, "GBP");
}
