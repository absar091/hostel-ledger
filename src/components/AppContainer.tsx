import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/contexts/SidebarContext";

interface AppContainerProps {
  children: ReactNode;
  className?: string;
}

const AppContainer = ({ children, className }: AppContainerProps) => {
  const { isOpen } = useSidebar();

  return (
    <div className={cn(
      "min-h-screen bg-white pb-24 lg:pb-0 transition-all duration-300",
      isOpen ? "lg:ml-64" : "lg:ml-20",
      className
    )}>
      {children}
    </div>
  );
};

export default AppContainer;
