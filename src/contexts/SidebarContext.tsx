import { createContext, useContext, useState, ReactNode, useMemo, useCallback } from "react";

interface SidebarContextType {
  isOpen: boolean;
  toggleSidebar: () => void;
  openSidebar: () => void;
  closeSidebar: () => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export const SidebarProvider = ({ children }: { children: ReactNode }) => {
  const [isOpen, setIsOpen] = useState(true);

  // ⚡ Bolt Performance Optimization:
  // Wrap context functions in useCallback to prevent stale closures and stabilize references,
  // then useMemo on the context value object. This prevents unnecessary re-renders of all
  // useSidebar consumers when the SidebarProvider's parent re-renders.
  const toggleSidebar = useCallback(() => setIsOpen(prev => !prev), []);
  const openSidebar = useCallback(() => setIsOpen(true), []);
  const closeSidebar = useCallback(() => setIsOpen(false), []);

  const value = useMemo(
    () => ({ isOpen, toggleSidebar, openSidebar, closeSidebar }),
    [isOpen, toggleSidebar, openSidebar, closeSidebar]
  );

  return (
    <SidebarContext.Provider value={value}>
      {children}
    </SidebarContext.Provider>
  );
};

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
};
