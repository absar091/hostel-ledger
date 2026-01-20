import { ReactNode } from "react";
import Sidebar from "./Sidebar";
import DesktopHeader from "./DesktopHeader";

interface AppLayoutProps {
  children: ReactNode;
  showMobileHeader?: boolean;
  mobileHeaderContent?: ReactNode;
}

const AppLayout = ({ children, showMobileHeader = true, mobileHeaderContent }: AppLayoutProps) => {
  return (
    <>
      {/* Desktop Sidebar */}
      <Sidebar />
      
      <div className="min-h-screen bg-[#F8F9FA] pb-24 lg:pb-0 lg:ml-64 safe-area-pt relative">
        {/* Desktop Header */}
        <DesktopHeader />
        
        {/* Mobile Header (optional) */}
        {showMobileHeader && mobileHeaderContent && (
          <div className="lg:hidden">
            {mobileHeaderContent}
          </div>
        )}
        
        {/* Main Content */}
        {children}
      </div>
    </>
  );
};

export default AppLayout;
