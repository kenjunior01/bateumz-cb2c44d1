import {
  ChefHat, Music, Camera, Video, Palette, Mic, Shirt, Dumbbell,
  Lightbulb, Smile, Trophy, LucideIcon,
} from "lucide-react";

export interface SubmissionField {
  key: string;
  label: string;
  type: "text" | "textarea" | "number" | "select";
  placeholder?: string;
  required?: boolean;
  options?: string[];
  maxLength?: number;
}

export interface ContestCategory {
  id: string;
  label: string;
  icon: LucideIcon;
  description: string;
  example: string;
  defaultEvaluation: "votes" | "views";
  requiresPhoto: boolean;
  requiresVideo: boolean;
  gradient: string;
  iconColor: string;
  defaultRules: string[];
  submissionFields: SubmissionField[];
  prizeIdea: string;
}

export const CONTEST_CATEGORIES: ContestCategory[] = [
  {
    id: "culinaria",
    label: "Culinária",
    icon: ChefHat,
    description: "Receitas, pratos típicos e criações gastronómicas",
    example: "Ex: Melhor caldo de Benny",
    defaultEvaluation: "votes",
    requiresPhoto: true,
    requiresVideo: false,
    gradient: "from-orange-500/20 to-red-500/20",
    iconColor: "text-orange-500",
    defaultRules: [
      "A receita deve ser original ou tradicional moçambicana",
      "Foto do prato finalizado é obrigatória",
      "Listar ingredientes principais e modo de preparo",
    ],
    submissionFields: [
      { key: "recipe_name", label: "Nome do prato", type: "text", required: true, maxLength: 80, placeholder: "Ex: Caldo de Benny da minha avó" },
      { key: "ingredients", label: "Ingredientes principais", type: "textarea", required: true, maxLength: 500, placeholder: "Liste os ingredientes..." },
      { key: "preparation", label: "Modo de preparo (resumo)", type: "textarea", required: false, maxLength: 800 },
      { key: "serves", label: "Serve quantas pessoas?", type: "number" },
    ],
    prizeIdea: "Cesta de produtos + voucher de supermercado",
  },
  {
    id: "musica",
    label: "Música & Dança",
    icon: Music,
    description: "Performances musicais, coreografias e talentos",
    example: "Ex: Melhor afro-beat moçambicano",
    defaultEvaluation: "views",
    requiresPhoto: false,
    requiresVideo: true,
    gradient: "from-purple-500/20 to-pink-500/20",
    iconColor: "text-purple-500",
    defaultRules: [
      "Vídeo de até 3 minutos",
      "Performance ao vivo ou gravada (sem playback completo)",
      "Conteúdo original ou cover autorizado",
    ],
    submissionFields: [
      { key: "song_title", label: "Título da música/coreografia", type: "text", required: true, maxLength: 80 },
      { key: "genre", label: "Género", type: "select", required: true, options: ["Marrabenta", "Pandza", "Afro-beat", "Hip-hop", "Gospel", "R&B", "Outro"] },
      { key: "instrument", label: "Instrumento principal (se aplicável)", type: "text" },
      { key: "duration", label: "Duração (segundos)", type: "number" },
    ],
    prizeIdea: "Sessão de gravação em estúdio + equipamento",
  },
  {
    id: "fotografia",
    label: "Fotografia",
    icon: Camera,
    description: "Capture momentos, paisagens e a beleza de Moçambique",
    example: "Ex: Melhor pôr do sol em Maputo",
    defaultEvaluation: "votes",
    requiresPhoto: true,
    requiresVideo: false,
    gradient: "from-blue-500/20 to-cyan-500/20",
    iconColor: "text-blue-500",
    defaultRules: [
      "Foto deve ser original e tirada pelo participante",
      "Edição básica permitida; sem IA generativa",
      "Resolução mínima recomendada: 1080p",
    ],
    submissionFields: [
      { key: "photo_title", label: "Título da fotografia", type: "text", required: true, maxLength: 80 },
      { key: "location", label: "Local da fotografia", type: "text", required: true, placeholder: "Ex: Praia da Costa do Sol, Maputo" },
      { key: "camera", label: "Câmara/equipamento", type: "text", placeholder: "Ex: iPhone 13, Canon EOS..." },
      { key: "story", label: "História por trás da foto", type: "textarea", maxLength: 500 },
    ],
    prizeIdea: "Câmara fotográfica + workshop de fotografia",
  },
  {
    id: "video-viral",
    label: "Vídeo Viral",
    icon: Video,
    description: "Vídeos curtos, criativos e cheios de humor",
    example: "Ex: TikTok mais engraçado",
    defaultEvaluation: "views",
    requiresPhoto: false,
    requiresVideo: true,
    gradient: "from-pink-500/20 to-rose-500/20",
    iconColor: "text-pink-500",
    defaultRules: [
      "Vídeo de 15 a 60 segundos",
      "Formato vertical (9:16) recomendado",
      "Sem conteúdo ofensivo ou impróprio",
    ],
    submissionFields: [
      { key: "video_title", label: "Título do vídeo", type: "text", required: true, maxLength: 80 },
      { key: "concept", label: "Conceito do vídeo", type: "textarea", required: true, maxLength: 300 },
      { key: "social_handle", label: "@ no TikTok/Instagram", type: "text" },
    ],
    prizeIdea: "Smartphone + ring light + tripé",
  },
  {
    id: "arte",
    label: "Arte & Design",
    icon: Palette,
    description: "Pinturas, ilustrações, design gráfico e artesanato",
    example: "Ex: Melhor logo de marca local",
    defaultEvaluation: "votes",
    requiresPhoto: true,
    requiresVideo: false,
    gradient: "from-emerald-500/20 to-teal-500/20",
    iconColor: "text-emerald-500",
    defaultRules: [
      "Obra original e inédita",
      "Foto/imagem de alta qualidade da obra",
      "Indicar técnica e materiais utilizados",
    ],
    submissionFields: [
      { key: "artwork_title", label: "Título da obra", type: "text", required: true, maxLength: 80 },
      { key: "technique", label: "Técnica", type: "select", required: true, options: ["Digital", "Pintura a óleo", "Aquarela", "Lápis", "Escultura", "Artesanato", "Outro"] },
      { key: "materials", label: "Materiais utilizados", type: "text" },
      { key: "inspiration", label: "Inspiração", type: "textarea", maxLength: 500 },
    ],
    prizeIdea: "Material de arte profissional + exposição",
  },
  {
    id: "comedia",
    label: "Comédia & Stand-up",
    icon: Mic,
    description: "Faça rir Moçambique com o seu talento",
    example: "Ex: Melhor piada em changana",
    defaultEvaluation: "views",
    requiresPhoto: false,
    requiresVideo: true,
    gradient: "from-yellow-500/20 to-amber-500/20",
    iconColor: "text-yellow-500",
    defaultRules: [
      "Vídeo de até 2 minutos",
      "Conteúdo respeitoso, sem ofensas a grupos",
      "Pode usar línguas locais (com legenda recomendada)",
    ],
    submissionFields: [
      { key: "skit_title", label: "Título do esquete", type: "text", required: true, maxLength: 80 },
      { key: "language", label: "Idioma principal", type: "select", required: true, options: ["Português", "Changana", "Macua", "Sena", "Misto"] },
      { key: "synopsis", label: "Sinopse", type: "textarea", maxLength: 300 },
    ],
    prizeIdea: "Microfone + apresentação em evento ao vivo",
  },
  {
    id: "moda",
    label: "Moda & Estilo",
    icon: Shirt,
    description: "Looks, capulanas modernas e tendências",
    example: "Ex: Melhor look com capulana",
    defaultEvaluation: "votes",
    requiresPhoto: true,
    requiresVideo: false,
    gradient: "from-fuchsia-500/20 to-purple-500/20",
    iconColor: "text-fuchsia-500",
    defaultRules: [
      "Foto de corpo inteiro do look",
      "Look montado pelo participante",
      "Indicar peças e onde foram adquiridas",
    ],
    submissionFields: [
      { key: "look_name", label: "Nome do look", type: "text", required: true, maxLength: 80 },
      { key: "style", label: "Estilo", type: "select", required: true, options: ["Tradicional", "Casual", "Formal", "Streetwear", "Afro-fusion"] },
      { key: "pieces", label: "Peças do look", type: "textarea", maxLength: 400 },
      { key: "designer", label: "Designer/marca (se aplicável)", type: "text" },
    ],
    prizeIdea: "Voucher de boutique + sessão fotográfica",
  },
  {
    id: "desporto",
    label: "Desporto & Fitness",
    icon: Dumbbell,
    description: "Desafios físicos, jogadas e habilidades",
    example: "Ex: Melhor golo amador",
    defaultEvaluation: "views",
    requiresPhoto: false,
    requiresVideo: true,
    gradient: "from-green-500/20 to-lime-500/20",
    iconColor: "text-green-500",
    defaultRules: [
      "Vídeo de até 90 segundos",
      "Atividade segura e respeitando outros",
      "Não usar substâncias proibidas",
    ],
    submissionFields: [
      { key: "challenge_name", label: "Nome do desafio", type: "text", required: true, maxLength: 80 },
      { key: "sport", label: "Modalidade", type: "select", required: true, options: ["Futebol", "Basquete", "Atletismo", "Fitness", "Calistenia", "Dança", "Outro"] },
      { key: "achievement", label: "Marca/recorde alcançado", type: "text" },
    ],
    prizeIdea: "Equipamento desportivo + assinatura de ginásio",
  },
  {
    id: "inovacao",
    label: "Inovação & Negócios",
    icon: Lightbulb,
    description: "Ideias empreendedoras e projectos sociais",
    example: "Ex: Melhor pitch de startup",
    defaultEvaluation: "votes",
    requiresPhoto: false,
    requiresVideo: true,
    gradient: "from-indigo-500/20 to-blue-500/20",
    iconColor: "text-indigo-500",
    defaultRules: [
      "Pitch em vídeo de até 3 minutos",
      "Ideia original ou em fase inicial",
      "Apresentar problema, solução e impacto",
    ],
    submissionFields: [
      { key: "project_name", label: "Nome do projeto/startup", type: "text", required: true, maxLength: 80 },
      { key: "sector", label: "Sector", type: "select", required: true, options: ["Tecnologia", "Agricultura", "Saúde", "Educação", "Energia", "Social", "Outro"] },
      { key: "problem", label: "Problema que resolve", type: "textarea", required: true, maxLength: 400 },
      { key: "solution", label: "Solução proposta", type: "textarea", required: true, maxLength: 400 },
      { key: "stage", label: "Fase do projeto", type: "select", options: ["Ideia", "Protótipo", "MVP", "Em operação"] },
    ],
    prizeIdea: "Investimento inicial + mentoria de negócios",
  },
  {
    id: "familia",
    label: "Crianças & Família",
    icon: Smile,
    description: "Talentos infantis, desenhos e momentos em família",
    example: "Ex: Desenho mais criativo",
    defaultEvaluation: "votes",
    requiresPhoto: true,
    requiresVideo: false,
    gradient: "from-cyan-500/20 to-sky-500/20",
    iconColor: "text-cyan-500",
    defaultRules: [
      "Submissões de menores devem ter autorização do encarregado",
      "Foto ou vídeo da criança/família com a obra/momento",
      "Conteúdo familiar apropriado",
    ],
    submissionFields: [
      { key: "child_name", label: "Nome da criança", type: "text", required: true, maxLength: 80 },
      { key: "child_age", label: "Idade da criança", type: "number", required: true },
      { key: "guardian_name", label: "Nome do encarregado", type: "text", required: true },
      { key: "consent", label: "Confirmo que tenho autorização do encarregado (sim/não)", type: "select", required: true, options: ["Sim", "Não"] },
    ],
    prizeIdea: "Brinquedos educativos + material escolar",
  },
  {
    id: "general",
    label: "Geral / Personalizado",
    icon: Trophy,
    description: "Concurso aberto sem categoria específica",
    example: "Configure os campos como preferir",
    defaultEvaluation: "votes",
    requiresPhoto: false,
    requiresVideo: false,
    gradient: "from-primary/20 to-accent/20",
    iconColor: "text-primary",
    defaultRules: [
      "Defina as suas próprias regras na descrição",
    ],
    submissionFields: [],
    prizeIdea: "À sua escolha",
  },
];

export const getCategory = (id: string): ContestCategory =>
  CONTEST_CATEGORIES.find((c) => c.id === id) || CONTEST_CATEGORIES[CONTEST_CATEGORIES.length - 1];
