export interface WheelTheme {
  name: string;
  description: string;
  backgroundColor: string;
  wheelBackgroundColor: string;
  wheelBorderColor: string;
  primaryColor: string;
  textColor: string;
  accentColor: string;
  segmentColors: string[];
}

export const PRESET_THEMES: Record<string, WheelTheme> = {
  cyberpunk: {
    name: "Cyberpunk Neon",
    description: "Estilo futurista com cores neon",
    backgroundColor: "#0a0a1a",
    wheelBackgroundColor: "#1a1a3a",
    wheelBorderColor: "#00ffff",
    primaryColor: "#ff00ff",
    textColor: "#00ffff",
    accentColor: "#ffff00",
    segmentColors: ["#ff00ff", "#00ffff", "#ffff00", "#ff00aa", "#00ffaa", "#aa00ff", "#ffaa00", "#00aaff"]
  },
  vegas: {
    name: "Cassino Clássico de Vegas",
    description: "Estilo luxuoso de cassino",
    backgroundColor: "#1a1000",
    wheelBackgroundColor: "#8b0000",
    wheelBorderColor: "#ffd700",
    primaryColor: "#ffd700",
    textColor: "#ffffff",
    accentColor: "#ff4500",
    segmentColors: ["#dc143c", "#228b22", "#ffd700", "#000080", "#ff4500", "#daa520", "#8b0000", "#32cd32"]
  },
  dark: {
    name: "Minimalista Dark",
    description: "Design limpo e moderno",
    backgroundColor: "#0f172a",
    wheelBackgroundColor: "#1e293b",
    wheelBorderColor: "#3b82f6",
    primaryColor: "#3b82f6",
    textColor: "#f1f5f9",
    accentColor: "#8b5cf6",
    segmentColors: ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#06b6d4", "#ec4899", "#6366f1"]
  },
  anime: {
    name: "Anime/Cel-Shading",
    description: "Estilo vibrante de anime",
    backgroundColor: "#1a0a2e",
    wheelBackgroundColor: "#2d1b4e",
    wheelBorderColor: "#ff69b4",
    primaryColor: "#ff69b4",
    textColor: "#ffffff",
    accentColor: "#87ceeb",
    segmentColors: ["#ff69b4", "#87ceeb", "#ffeb3b", "#98fb98", "#dda0dd", "#f0e68c", "#9370db", "#00ced1"]
  },
  retro: {
    name: "Retro 8-Bit",
    description: "Estilo de jogos retro",
    backgroundColor: "#000000",
    wheelBackgroundColor: "#4a0080",
    wheelBorderColor: "#00ff00",
    primaryColor: "#00ff00",
    textColor: "#ffffff",
    accentColor: "#ff0000",
    segmentColors: ["#ff0000", "#ffff00", "#00ff00", "#00ffff", "#0000ff", "#ff00ff", "#ffa500", "#008000"]
  }
};
