import { Home, Users, Clock, Settings, LogOut, ChevronLeft, ChevronRight, Mail } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useFirebaseAuth } from "@/contexts/FirebaseAuthContext";
import { useSidebar } from "@/contexts/SidebarContext";
import { useInvitations } from "@/hooks/useInvitations";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import Logo from "./Logo";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const Sidebar = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useFirebaseAuth();
  const { isOpen, toggleSidebar } = useSidebar();
  const { count: pendingInvites } = useInvitations();

  const handleLogout = async () => {
    try {
      await logout();
      toast.success(t('sidebar.logout_success'));
      navigate("/login");
    } catch (error) {
      toast.error(t('sidebar.logout_failed'));
    }
  };

  const navItems = [
    { id: "dashboard", icon: Home, label: "Home", path: "/", badge: pendingInvites },
    { id: "groups", icon: Users, label: "Groups", path: "/groups" },
    { id: "activity", icon: Clock, label: "History", path: "/activity" },
    { id: "settings", icon: Settings, label: "Me", path: "/settings" },
  ];

  const isActive = (path: string) => {
    if (path === "/") {
      return location.pathname === "/";
    }
    return location.pathname.startsWith(path);
  };

  return (
    <TooltipProvider>
      <aside className={cn(
      "hidden lg:flex lg:flex-col fixed left-0 top-0 h-screen bg-white border-r border-gray-200 z-40 transition-all duration-300",
      isOpen ? "w-64" : "w-20"
    )}>
      {/* Logo Section */}
      <div className="p-6 border-b border-gray-200 flex items-center justify-between">
        {isOpen ? (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#1B4332] rounded-xl flex items-center justify-center flex-shrink-0">
              <Logo size={20} className="text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-black text-gray-900 tracking-tight truncate">Hostel Ledger</h1>
              <p className="text-xs text-gray-500 font-medium truncate">{t('sidebar.motto')}</p>
            </div>
          </div>
        ) : (
          <div className="w-10 h-10 bg-[#1B4332] rounded-xl flex items-center justify-center mx-auto">
            <Logo size={20} className="text-white" />
          </div>
        )}
      </div>

      {/* Toggle Button */}
      <button
        onClick={toggleSidebar}
        aria-label={isOpen ? t('sidebar.collapse') : t('sidebar.expand')}
        className="absolute -right-3 top-24 w-6 h-6 bg-white border border-gray-200 rounded-full flex items-center justify-center hover:bg-gray-50 transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4a6850]"
      >
        {isOpen ? (
          <ChevronLeft className="w-4 h-4 text-gray-600" />
        ) : (
          <ChevronRight className="w-4 h-4 text-gray-600" />
        )}
      </button>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {/* Section Label */}
        {isOpen && (
          <div className="px-4 py-2 mb-2">
            <span className="text-xs font-black uppercase tracking-widest text-gray-400">{t('sidebar.main_label')}</span>
          </div>
        )}

        {navItems.map((item: any) => {
          const Icon = item.icon;
          const active = isActive(item.path);

          const buttonElement = (
            <button
              onClick={() => navigate(item.path)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4a6850] focus-visible:ring-offset-1",
                active
                  ? "bg-[#1B4332] text-white shadow-lg"
                  : "text-gray-600 hover:bg-gray-100",
                !isOpen && "justify-center"
              )}
            >
              {/* Active indicator bar */}
              {active && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-emerald-400 rounded-r-full"></div>
              )}
              <Icon className={cn("w-5 h-5 flex-shrink-0", active && "font-bold")} />
              {isOpen && <span className={cn("font-bold truncate", active && "font-black")}>{item.label}</span>}

              {/* Badge */}
              {item.badge > 0 && (
                <div className={cn(
                  "bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white",
                  isOpen ? "ml-auto px-1.5 h-5 min-w-[20px]" : "absolute -top-1 -right-1 w-4 h-4"
                )}>
                  {item.badge}
                </div>
              )}
            </button>
          );

          return isOpen ? (
            <div key={item.id}>{buttonElement}</div>
          ) : (
            <Tooltip key={item.id}>
              <TooltipTrigger asChild>
                {buttonElement}
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>{item.label}</p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </nav>

      {/* User Profile Section */}
      <div className="p-4 border-t border-gray-200">
        {isOpen ? (
          <>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 mb-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#4a6850] to-[#3d5643] flex items-center justify-center flex-shrink-0">
                <span className="text-lg font-black text-white">
                  {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-black text-gray-900 text-sm truncate">{user?.name || "User"}</p>
                <p className="text-xs text-gray-500 truncate">{user?.email || ""}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              aria-label={t('sidebar.logout')}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-gray-600 hover:bg-gray-100 hover:text-red-600 transition-all duration-200 font-medium"
            >
              <LogOut className="w-5 h-5" />
              <span>{t('sidebar.logout')}</span>
            </button>
          </>
        ) : (
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => navigate("/profile")}
                  className="w-10 h-10 rounded-full bg-gradient-to-br from-[#4a6850] to-[#3d5643] flex items-center justify-center mx-auto mb-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4a6850] focus-visible:ring-offset-1"
                  aria-label={user?.name || "Profile"}
                >
                  <span className="text-lg font-black text-white">
                    {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
                  </span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>{user?.name || "Profile"}</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center px-4 py-3 rounded-xl text-gray-600 hover:bg-gray-100 hover:text-red-600 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-1"
                  aria-label={t('sidebar.logout')}
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="bg-red-50 text-red-600 border-red-100 font-medium">
                <p>{t('sidebar.logout')}</p>
              </TooltipContent>
            </Tooltip>
          </>
        )}
      </div>
      </aside>
    </TooltipProvider>
  );
};

export default Sidebar;
