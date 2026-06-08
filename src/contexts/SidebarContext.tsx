import { createContext, useContext, useState, ReactNode, useCallback, useMemo } from "react";

interface SidebarContextType {
  isOpen: boolean;
  toggleSidebar: () => void;
  openSidebar: () => void;
  closeSidebar: () => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export const SidebarProvider = ({ children }: { children: ReactNode }) => {
  const [isOpen, setIsOpen] = useState(true);

  // Memoize callback functions to maintain stable references and avoid breaking useMemo dependencies
  const toggleSidebar = useCallback(() => setIsOpen((prev) => !prev), []);
  const openSidebar = useCallback(() => setIsOpen(true), []);
  const closeSidebar = useCallback(() => setIsOpen(false), []);

  // Memoize the context value object to prevent unnecessary re-renders of all consuming components
  // when the SidebarProvider's parent re-renders
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
