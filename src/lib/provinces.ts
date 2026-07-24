// Backwards-compat shim — Mozambique provinces removed in NA pivot.
// Re-exports US states under the old names so existing imports keep compiling.
export { PROVINCES, CITIES_BY_PROVINCE } from "./regions";
