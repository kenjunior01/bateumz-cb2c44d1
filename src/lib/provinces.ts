export const PROVINCES = [
  { value: "maputo-cidade", label: "Maputo Cidade" },
  { value: "maputo", label: "Maputo Província" },
  { value: "gaza", label: "Gaza" },
  { value: "inhambane", label: "Inhambane" },
  { value: "sofala", label: "Sofala" },
  { value: "manica", label: "Manica" },
  { value: "tete", label: "Tete" },
  { value: "zambezia", label: "Zambézia" },
  { value: "nampula", label: "Nampula" },
  { value: "niassa", label: "Niassa" },
  { value: "cabo-delgado", label: "Cabo Delgado" },
] as const;

export const CITIES_BY_PROVINCE: Record<string, string[]> = {
  "maputo-cidade": ["Maputo"],
  "maputo": ["Matola", "Boane", "Marracuene", "Namaacha"],
  "gaza": ["Xai-Xai", "Chókwè", "Chibuto", "Bilene"],
  "inhambane": ["Inhambane", "Maxixe", "Vilankulo", "Tofo"],
  "sofala": ["Beira", "Dondo", "Gorongosa"],
  "manica": ["Chimoio", "Gondola", "Manica"],
  "tete": ["Tete", "Moatize", "Cahora Bassa"],
  "zambezia": ["Quelimane", "Mocuba", "Gurué"],
  "nampula": ["Nampula", "Nacala", "Ilha de Moçambique", "Angoche"],
  "niassa": ["Lichinga", "Cuamba", "Mandimba"],
  "cabo-delgado": ["Pemba", "Montepuez", "Mocímboa da Praia"],
};
