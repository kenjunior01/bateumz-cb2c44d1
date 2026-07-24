import { z } from "zod";

export type PrestacaoCategory =
  | "viaturas"
  | "imoveis"
  | "eletronicos"
  | "equipamentos"
  | "outros";

export const PRESTACAO_CATEGORIES: { id: PrestacaoCategory; label: string }[] = [
  { id: "viaturas", label: "Viaturas" },
  { id: "imoveis", label: "Imóveis" },
  { id: "eletronicos", label: "Eletrónicos" },
  { id: "equipamentos", label: "Equipamentos" },
  { id: "outros", label: "Outros" },
];

export const PRESTACAO_STATUSES = [
  { value: "active", label: "Ativo (visível no catálogo)" },
  { value: "draft", label: "Rascunho (oculto)" },
  { value: "sold_out", label: "Esgotado" },
  { value: "archived", label: "Arquivado" },
] as const;

export type PrestacaoStatus = (typeof PRESTACAO_STATUSES)[number]["value"];

/** Indicative defaults by category (annual rate / max months). */
export const CATEGORY_DEFAULTS: Record<
  PrestacaoCategory,
  { annualRate: number; maxMonths: number }
> = {
  imoveis: { annualRate: 0.12, maxMonths: 60 },
  viaturas: { annualRate: 0.18, maxMonths: 60 },
  equipamentos: { annualRate: 0.2, maxMonths: 48 },
  eletronicos: { annualRate: 0.24, maxMonths: 24 },
  outros: { annualRate: 0.2, maxMonths: 24 },
};

export function monthlyInstallment(
  principal: number,
  annualRate: number,
  months: number,
) {
  if (months <= 0 || principal <= 0) return 0;
  const r = annualRate / 12;
  if (r === 0) return principal / months;
  return (principal * r) / (1 - Math.pow(1 + r, -months));
}

/** Clamp simulator inputs to safe ranges. */
export function clampSimulation(opts: {
  totalPrice: number;
  minDownPayment: number;
  maxMonths: number;
  downPayment: number;
  months: number;
}) {
  const maxDown = Math.max(opts.totalPrice * 0.9, opts.minDownPayment);
  const downPayment = Math.min(
    Math.max(opts.downPayment, opts.minDownPayment),
    maxDown,
  );
  const months = Math.min(Math.max(opts.months, 3), Math.max(opts.maxMonths, 3));
  return { downPayment, months };
}

const phoneRegex = /^[+]?[0-9 ()-]{8,20}$/;

export const productSchema = z
  .object({
    title: z.string().trim().min(3, "Título muito curto").max(120),
    category: z.enum(["viaturas", "imoveis", "eletronicos", "equipamentos", "outros"]),
    description: z.string().trim().max(2000).optional().or(z.literal("")),
    total_price: z.number().positive("Preço tem de ser maior que zero"),
    min_down_payment: z.number().min(0, "Entrada mínima inválida"),
    max_months: z
      .number()
      .int()
      .min(1, "Prazo mínimo é 1 mês")
      .max(120, "Prazo máximo é 120 meses"),
    annual_rate: z
      .number()
      .min(0, "Taxa inválida")
      .max(1, "Taxa deve estar entre 0 e 1 (ex.: 0.18)"),
    images: z.array(z.string().url("URL de imagem inválida")).max(8),
    province: z.string().trim().max(60).optional().or(z.literal("")),
    city: z.string().trim().max(60).optional().or(z.literal("")),
    brand: z.string().trim().max(60).optional().or(z.literal("")),
    model: z.string().trim().max(60).optional().or(z.literal("")),
    year: z
      .number()
      .int()
      .min(1950)
      .max(new Date().getFullYear() + 1)
      .optional()
      .nullable(),
    whatsapp: z
      .string()
      .trim()
      .regex(phoneRegex, "WhatsApp inválido (use apenas dígitos, ex.: +258...)"),
    stock: z.number().int().min(0, "Stock não pode ser negativo"),
    status: z.enum(["active", "draft", "sold_out", "archived"]),
    featured: z.boolean(),
  })
  .refine((d) => d.min_down_payment < d.total_price, {
    path: ["min_down_payment"],
    message: "Entrada mínima tem de ser inferior ao preço total",
  });

export type ProductInput = z.infer<typeof productSchema>;

export function buildWhatsAppMessage(params: {
  productTitle: string;
  totalPrice: number;
  downPayment: number;
  months: number;
  monthly: number;
  visitorName?: string;
}) {
  const fmt = new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "MZN",
    maximumFractionDigits: 0,
  });
  const lines = [
    "Olá! Vi o seu anúncio na Bateu:",
    `📦 ${params.productTitle}`,
    `💰 Valor total: ${fmt.format(params.totalPrice)}`,
    `💵 Entrada pretendida: ${fmt.format(params.downPayment)}`,
    `📅 Prazo: ${params.months} meses`,
    `📊 Mensalidade estimada: ${fmt.format(params.monthly)}`,
    "",
    params.visitorName
      ? `Sou ${params.visitorName} e gostaria de mais informações.`
      : "Gostaria de mais informações sobre a aquisição.",
  ];
  return lines.join("\n");
}
