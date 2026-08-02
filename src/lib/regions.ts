// Multi-country regions for Bateu (global, English-default).
// Supports US, CA, MZ, AO, BR, PT, IN.

export const COUNTRIES = [
  { code: "US", label: "United States", flag: "\U0001F1FA\U0001F1F8", currency: "USD", dial: "+1" },
  { code: "CA", label: "Canada", flag: "\U0001F1E8\U0001F1E6", currency: "CAD", dial: "+1" },
  { code: "PT", label: "Portugal", flag: "\U0001F1F5\U0001F1F9", currency: "EUR", dial: "+351" },
  { code: "BR", label: "Brazil", flag: "\U0001F1E7\U0001F1F7", currency: "BRL", dial: "+55" },
  { code: "MZ", label: "Mozambique", flag: "\U0001F1F2\U0001F1FF", currency: "MZN", dial: "+258" },
  { code: "AO", label: "Angola", flag: "\U0001F1E6\U0001F1F4", currency: "AOA", dial: "+244" },
  { code: "IN", label: "India", flag: "\U0001F1EE\U0001F1F3", currency: "INR", dial: "+91" },
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
  ["zambezia","Zamb\u00e9zia"],["nampula","Nampula"],["niassa","Niassa"],["cabo-delgado","Cabo Delgado"],
];

const AO_PROVINCES: ReadonlyArray<readonly [string, string]> = [
  ["luanda","Luanda"],["bengo","Bengo"],["benguela","Benguela"],["bie","Bi\u00e9"],
  ["cabinda","Cabinda"],["cuando-cubango","Cuando Cubango"],["cuanza-norte","Cuanza Norte"],
  ["cuanza-sul","Cuanza Sul"],["cunene","Cunene"],["huambo","Huambo"],["huila","Huíla"],
  ["lunda-norte","Lunda Norte"],["lunda-sul","Lunda Sul"],["malanje","Malanje"],
  ["moxico","Moxico"],["namibe","Namibe"],["uige","U\u00edge"],["zaire","Zaire"],
];

const BR_STATES: ReadonlyArray<readonly [string, string]> = [
  ["AC","Acre"],["AL","Alagoas"],["AP","Amap\u00e1"],["AM","Amazonas"],["BA","Bahia"],
  ["CE","Cear\u00e1"],["DF","Distrito Federal"],["ES","Esp\u00edrito Santo"],["GO","Goi\u00e1s"],
  ["MA","Maranh\u00e3o"],["MT","Mato Grosso"],["MS","Mato Grosso do Sul"],["MG","Minas Gerais"],
  ["PA","Par\u00e1"],["PB","Para\u00edba"],["PR","Paran\u00e1"],["PE","Pernambuco"],["PI","Piau\u00ed"],
  ["RJ","Rio de Janeiro"],["RN","Rio Grande do Norte"],["RS","Rio Grande do Sul"],
  ["RO","Rond\u00f4nia"],["RR","Roraima"],["SC","Santa Catarina"],["SP","S\u00e3o Paulo"],
  ["SE","Sergipe"],["TO","Tocantins"],
];

const PT_DISTRICTS: ReadonlyArray<readonly [string, string]> = [
  ["aveiro","Aveiro"],["beja","Beja"],["braga","Braga"],["braganca","Bragan\u00e7a"],
  ["castelo-branco","Castelo Branco"],["coimbra","Coimbra"],["evora","\u00c9vora"],
  ["faro","Faro"],["guarda","Guarda"],["leiria","Leiria"],["lisboa","Lisboa"],
  ["portalegre","Portalegre"],["porto","Porto"],["santarem","Santar\u00e9m"],
  ["setubal","Set\u00fabal"],["viana-do-castelo","Viana do Castelo"],["vila-real","Vila Real"],
  ["viseu","Viseu"],["acores","A\u00e7ores"],["madeira","Madeira"],
];

const IN_STATES: ReadonlyArray<readonly [string, string]> = [
  ["AN","Andaman & Nicobar Islands"],["AP","Andhra Pradesh"],["AR","Arunachal Pradesh"],
  ["AS","Assam"],["BR","Bihar"],["CH","Chandigarh"],["CT","Chhattisgarh"],
  ["DN","Dadra and Nagar Haveli and Daman and Diu"],["DL","Delhi"],["GA","Goa"],
  ["GJ","Gujarat"],["HR","Haryana"],["HP","Himachal Pradesh"],["JK","Jammu and Kashmir"],
  ["JH","Jharkhand"],["KA","Karnataka"],["KL","Kerala"],["LA","Ladakh"],
  ["LD","Lakshadweep"],["MP","Madhya Pradesh"],["MH","Maharashtra"],["MN","Manipur"],
  ["ML","Meghalaya"],["MZ","Mizoram"],["NL","Nagaland"],["OD","Odisha"],
  ["PB","Punjab"],["PY","Puducherry"],["RJ","Rajasthan"],["SK","Sikkim"],
  ["TN","Tamil Nadu"],["TG","Telangana"],["TR","Tripura"],["UP","Uttar Pradesh"],
  ["UK","Uttarakhand"],["WB","West Bengal"],
];

export const REGIONS_BY_COUNTRY: Record<string, { value: string; label: string }[]> = {
  US: US_STATES.map(([value, label]) => ({ value: value.toLowerCase(), label })),
  CA: CA_PROVINCES.map(([value, label]) => ({ value: value.toLowerCase(), label })),
  MZ: MZ_PROVINCES.map(([value, label]) => ({ value, label })),
  AO: AO_PROVINCES.map(([value, label]) => ({ value, label })),
  BR: BR_STATES.map(([value, label]) => ({ value: value.toLowerCase(), label })),
  PT: PT_DISTRICTS.map(([value, label]) => ({ value, label })),
  IN: IN_STATES.map(([value, label]) => ({ value: value.toLowerCase(), label })),
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
  IN: ["upi", "paytm", "phonepe", "gpay", "rupay", "paypal", "bank_transfer"],
};
