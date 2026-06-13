import { createContext, useContext, useState, useCallback, useMemo, ReactNode } from "react";

interface SidebarContextType {
  isOpen: boolean;
  toggleSidebar: () => void;
  openSidebar: () => void;
  closeSidebar: () => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export const SidebarProvider = ({ children }: { children: ReactNode }) => {
  const [isOpen, setIsOpen] = useState(true);

  // ⚡ Bolt: Memoize sidebar toggle functions to prevent unnecessary re-renders in consumers
  const toggleSidebar = useCallback(() => setIsOpen(prev => !prev), []);
  const openSidebar = useCallback(() => setIsOpen(true), []);
  const closeSidebar = useCallback(() => setIsOpen(false), []);

  // ⚡ Bolt: Memoize context value to prevent unnecessary re-renders of consumers when SidebarProvider re-renders
  const value = useMemo(() => ({ isOpen, toggleSidebar, openSidebar, closeSidebar }), [isOpen, toggleSidebar, openSidebar, closeSidebar]);

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
