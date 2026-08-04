import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

interface MobileNavContextType {
  menuOpen: boolean;
  setMenuOpen: (open: boolean) => void;
  toggleMenu: () => void;
  openMenu: () => void;
  closeMenu: () => void;
}

const MobileNavContext = createContext<MobileNavContextType | null>(null);

export function MobileNavProvider({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);

  const toggleMenu = useCallback(() => setMenuOpen((p) => !p), []);
  const openMenu = useCallback(() => setMenuOpen(true), []);
  const closeMenu = useCallback(() => setMenuOpen(false), []);

  return (
    <MobileNavContext.Provider value={{ menuOpen, setMenuOpen, toggleMenu, openMenu, closeMenu }}>
      {children}
    </MobileNavContext.Provider>
  );
}

export function useMobileNav() {
  const ctx = useContext(MobileNavContext);
  if (!ctx) throw new Error("useMobileNav must be used within MobileNavProvider");
  return ctx;
}
