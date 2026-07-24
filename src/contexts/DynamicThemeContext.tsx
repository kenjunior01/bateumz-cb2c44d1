import { createContext, useContext, ReactNode, useState, useEffect } from 'react';

interface DynamicTheme {
  primary: string;
  secondary: string;
  background: string;
  text: string;
  accent: string;
}

interface DynamicThemeContextType {
  theme: DynamicTheme;
  setTheme: (theme: Partial<DynamicTheme>) => void;
  applyTheme: () => void;
}

const DEFAULT_THEME: DynamicTheme = {
  primary: '#fbbf24', // Yellow-400
  secondary: '#3b82f6', // Blue-500
  background: '#0a0e17',
  text: '#ffffff',
  accent: '#8b5cf6', // Purple-500
};

const DynamicThemeContext = createContext<DynamicThemeContextType | undefined>(undefined);

export const DynamicThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setThemeState] = useState<DynamicTheme>(DEFAULT_THEME);

  const setTheme = (newTheme: Partial<DynamicTheme>) => {
    setThemeState(prev => ({ ...prev, ...newTheme }));
  };

  const applyTheme = () => {
    const root = document.documentElement;
    root.style.setProperty('--theme-primary', theme.primary);
    root.style.setProperty('--theme-secondary', theme.secondary);
    root.style.setProperty('--theme-background', theme.background);
    root.style.setProperty('--theme-text', theme.text);
    root.style.setProperty('--theme-accent', theme.accent);
  };

  // Apply theme whenever it changes
  useEffect(() => {
    applyTheme();
  }, [theme]);

  // Initialize on mount
  useEffect(() => {
    applyTheme();
  }, []);

  return (
    <DynamicThemeContext.Provider value={{ theme, setTheme, applyTheme }}>
      {children}
    </DynamicThemeContext.Provider>
  );
};

export const useDynamicTheme = () => {
  const context = useContext(DynamicThemeContext);
  if (!context) {
    throw new Error('useDynamicTheme must be used within a DynamicThemeProvider');
  }
  return context;
};
