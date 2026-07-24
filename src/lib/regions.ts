// Multi-country regions for Bateu (global, English-default).
// Supports US, CA, MZ, AO, BR, PT.

export const COUNTRIES = [
  { code: "US", label: "United States", flag: "🇺🇸", currency: "USD", dial: "+1" },
  { code: "CA", label: "Canada", flag: "🇨🇦", currency: "CAD", dial: "+1" },
  { code: "PT", label: "Portugal", flag: "🇵🇹", currency: "EUR", dial: "+351" },
  { code: "BR", label: "Brazil", flag: "🇧🇷", currency: "BRL", dial: "+55" },
  { code: "MZ", label: "Mozambique", flag: "🇲🇿", currency: "MZN", dial: "+258" },
  { code: "AO", label: "Angola", flag: "🇦🇴", currency: "AOA", dial: "+244" },
] as const;

export type CountryCode = typeof COUNTRIES[number]["code"];

const US_STATES: ReadonlyArray<readonly [string, string]> = [
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
];

const CA_PROVINCES: ReadonlyArray<readonly [string, string]> = [
  ["AB","Alberta"],["BC","British Columbia"],["MB","Manitoba"],["NB","New Brunswick"],
  ["NL","Newfoundland and Labrador"],["NS","Nova Scotia"],["NT","Northwest Territories"],
  ["NU","Nunavut"],["ON","Ontario"],["PE","Prince Edward Island"],["QC","Quebec"],
  ["SK","Saskatchewan"],["YT","Yukon"],
];

const MZ_PROVINCES: ReadonlyArray<readonly [string, string]> = [
  ["maputo-cidade","Maputo City"],["maputo","Maputo Province"],["gaza","Gaza"],
  ["inhambane","Inhambane"],["sofala","Sofala"],["manica","Manica"],["tete","Tete"],
  ["zambezia","Zambézia"],["nampula","Nampula"],["niassa","Niassa"],["cabo-delgado","Cabo Delgado"],
];

const AO_PROVINCES: ReadonlyArray<readonly [string, string]> = [
  ["luanda","Luanda"],["bengo","Bengo"],["benguela","Benguela"],["bie","Bié"],
  ["cabinda","Cabinda"],["cuando-cubango","Cuando Cubango"],["cuanza-norte","Cuanza Norte"],
  ["cuanza-sul","Cuanza Sul"],["cunene","Cunene"],["huambo","Huambo"],["huila","Huíla"],
  ["lunda-norte","Lunda Norte"],["lunda-sul","Lunda Sul"],["malanje","Malanje"],
  ["moxico","Moxico"],["namibe","Namibe"],["uige","Uíge"],["zaire","Zaire"],
];

const BR_STATES: ReadonlyArray<readonly [string, string]> = [
  ["AC","Acre"],["AL","Alagoas"],["AP","Amapá"],["AM","Amazonas"],["BA","Bahia"],
  ["CE","Ceará"],["DF","Distrito Federal"],["ES","Espírito Santo"],["GO","Goiás"],
  ["MA","Maranhão"],["MT","Mato Grosso"],["MS","Mato Grosso do Sul"],["MG","Minas Gerais"],
  ["PA","Pará"],["PB","Paraíba"],["PR","Paraná"],["PE","Pernambuco"],["PI","Piauí"],
  ["RJ","Rio de Janeiro"],["RN","Rio Grande do Norte"],["RS","Rio Grande do Sul"],
  ["RO","Rondônia"],["RR","Roraima"],["SC","Santa Catarina"],["SP","São Paulo"],
  ["SE","Sergipe"],["TO","Tocantins"],
];

const PT_DISTRICTS: ReadonlyArray<readonly [string, string]> = [
  ["aveiro","Aveiro"],["beja","Beja"],["braga","Braga"],["braganca","Bragança"],
  ["castelo-branco","Castelo Branco"],["coimbra","Coimbra"],["evora","Évora"],
  ["faro","Faro"],["guarda","Guarda"],["leiria","Leiria"],["lisboa","Lisboa"],
  ["portalegre","Portalegre"],["porto","Porto"],["santarem","Santarém"],
  ["setubal","Setúbal"],["viana-do-castelo","Viana do Castelo"],["vila-real","Vila Real"],
  ["viseu","Viseu"],["acores","Açores"],["madeira","Madeira"],
];

export const REGIONS_BY_COUNTRY: Record<string, { value: string; label: string }[]> = {
  US: US_STATES.map(([value, label]) => ({ value: value.toLowerCase(), label })),
  CA: CA_PROVINCES.map(([value, label]) => ({ value: value.toLowerCase(), label })),
  MZ: MZ_PROVINCES.map(([value, label]) => ({ value, label })),
  AO: AO_PROVINCES.map(([value, label]) => ({ value, label })),
  BR: BR_STATES.map(([value, label]) => ({ value: value.toLowerCase(), label })),
  PT: PT_DISTRICTS.map(([value, label]) => ({ value, label })),
};

export function getRegions(country: string) {
  return REGIONS_BY_COUNTRY[country] ?? [];
}

export function getCountryLabel(code: string) {
  return COUNTRIES.find((c) => c.code === code)?.label ?? code;
}

// Backwards-compat: PROVINCES kept for legacy imports. Defaults to US states.
export const PROVINCES = REGIONS_BY_COUNTRY.US;
export const CITIES_BY_PROVINCE: Record<string, string[]> = {};

// Standard payment methods per country (used by checkout UI to pick options).
// PayPal is the real gateway; locals route to the existing manual receipt flow.
export const PAYMENT_METHODS_BY_COUNTRY: Record<string, string[]> = {
  US: ["paypal"],
  CA: ["paypal"],
  PT: ["paypal", "mbway", "bank_transfer"],
  BR: ["paypal", "pix", "boleto"],
  MZ: ["mpesa", "emola", "bank_transfer"],
  AO: ["multicaixa", "unitel_money", "bai_transfer"],
};
