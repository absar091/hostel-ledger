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

  // Memoize functions to prevent stale closures and unnecessary re-renders
  const toggleSidebar = useCallback(() => setIsOpen((prev) => !prev), []);
  const openSidebar = useCallback(() => setIsOpen(true), []);
  const closeSidebar = useCallback(() => setIsOpen(false), []);

  // Memoize context value to prevent re-renders of all consumers
  const value = useMemo(() => ({
    isOpen,
    toggleSidebar,
    openSidebar,
    closeSidebar
  }), [isOpen, toggleSidebar, openSidebar, closeSidebar]);

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
