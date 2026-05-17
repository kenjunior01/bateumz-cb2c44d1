// US + Canada regions for the North American platform.
// Backwards compatible: PROVINCES/CITIES_BY_PROVINCE re-exported below.

export const COUNTRIES = [
  { code: "US", label: "United States", flag: "🇺🇸", currency: "USD" },
  { code: "CA", label: "Canada", flag: "🇨🇦", currency: "CAD" },
] as const;

export type CountryCode = typeof COUNTRIES[number]["code"];

const US_STATES = [
  ["AL","Alabama"],["AK","Alaska"],["AZ","Arizona"],["AR","Arkansas"],["CA","California"],
  ["CO","Colorado"],["CT","Connecticut"],["DE","Delaware"],["DC","District of Columbia"],
  ["FL","Florida"],["GA","Georgia"],["HI","Hawaii"],["ID","Idaho"],["IL","Illinois"],
  ["IN","Indiana"],["IA","Iowa"],["KS","Kansas"],["KY","Kentucky"],["LA","Louisiana"],
  ["ME","Maine"],["MD","Maryland"],["MA","Massachusetts"],["MI","Michigan"],["MN","Minnesota"],
  ["MS","Mississippi"],["MO","Missouri"],["MT","Montana"],["NE","Nebraska"],["NV","Nevada"],
  ["NH","New Hampshire"],["NJ","New Jersey"],["NM","New Mexico"],["NY","New York"],
  ["NC","North Carolina"],["ND","North Dakota"],["OH","Ohio"],["OK","Oklahoma"],["OR","Oregon"],
  ["PA","Pennsylvania"],["RI","Rhode Island"],["SC","South Carolina"],["SD","South Dakota"],
  ["TN","Tennessee"],["TX","Texas"],["UT","Utah"],["VT","Vermont"],["VA","Virginia"],
  ["WA","Washington"],["WV","West Virginia"],["WI","Wisconsin"],["WY","Wyoming"],
] as const;

const CA_PROVINCES = [
  ["AB","Alberta"],["BC","British Columbia"],["MB","Manitoba"],["NB","New Brunswick"],
  ["NL","Newfoundland and Labrador"],["NS","Nova Scotia"],["NT","Northwest Territories"],
  ["NU","Nunavut"],["ON","Ontario"],["PE","Prince Edward Island"],["QC","Quebec"],
  ["SK","Saskatchewan"],["YT","Yukon"],
] as const;

export const REGIONS_BY_COUNTRY: Record<string, { value: string; label: string }[]> = {
  US: US_STATES.map(([value, label]) => ({ value: value.toLowerCase(), label })),
  CA: CA_PROVINCES.map(([value, label]) => ({ value: value.toLowerCase(), label })),
};

export function getRegions(country: string) {
  return REGIONS_BY_COUNTRY[country] ?? [];
}

export function getCountryLabel(code: string) {
  return COUNTRIES.find((c) => c.code === code)?.label ?? code;
}

// Backwards-compat: PROVINCES used to mean Mozambique provinces; now means US states.
export const PROVINCES = REGIONS_BY_COUNTRY.US;
export const CITIES_BY_PROVINCE: Record<string, string[]> = {};
