import { Home, Users, Clock, Settings, LogOut, ChevronLeft, ChevronRight } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useFirebaseAuth } from "@/contexts/FirebaseAuthContext";
import { useSidebar } from "@/contexts/SidebarContext";
import { toast } from "sonner";

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useFirebaseAuth();
  const { isOpen, toggleSidebar } = useSidebar();

  const handleLogout = async () => {
    try {
      await logout();
      toast.success("Logged out successfully");
      navigate("/login");
    } catch (error) {
      toast.error("Failed to logout");
    }
  };

  const navItems = [
    { id: "dashboard", icon: Home, label: "Dashboard", path: "/" },
    { id: "groups", icon: Users, label: "Groups", path: "/groups" },
    { id: "activity", icon: Clock, label: "Activity", path: "/activity" },
    { id: "settings", icon: Settings, label: "Settings", path: "/profile" },
  ];

  const isActive = (path: string) => {
    if (path === "/") {
      return location.pathname === "/";
    }
    return location.pathname.startsWith(path);
  };

  return (
    <aside className={cn(
      "hidden lg:flex lg:flex-col fixed left-0 top-0 h-screen bg-white border-r border-gray-200 z-40 transition-all duration-300",
      isOpen ? "w-64" : "w-20"
    )}>
      {/* Logo Section */}
      <div className="p-6 border-b border-gray-200 flex items-center justify-between">
        {isOpen ? (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#1B4332] rounded-xl flex items-center justify-center flex-shrink-0">
              <img
                src="/only-logo.png"
                alt="Hostel Ledger"
                className="w-5 h-5 object-contain filter brightness-0 invert"
              />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-black text-gray-900 tracking-tight truncate">Hostel Ledger</h1>
              <p className="text-xs text-gray-500 font-medium truncate">Split expenses easily</p>
            </div>
          </div>
        ) : (
          <div className="w-10 h-10 bg-[#1B4332] rounded-xl flex items-center justify-center mx-auto">
            <img
              src="/only-logo.png"
              alt="Hostel Ledger"
              className="w-5 h-5 object-contain filter brightness-0 invert"
            />
          </div>
        )}
      </div>

      {/* Toggle Button */}
      <button
        onClick={toggleSidebar}
        className="absolute -right-3 top-24 w-6 h-6 bg-white border border-gray-200 rounded-full flex items-center justify-center hover:bg-gray-50 transition-colors shadow-sm"
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
            <span className="text-xs font-black uppercase tracking-widest text-gray-400">Main</span>
          </div>
        )}
        
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);

          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 relative",
                active
                  ? "bg-[#1B4332] text-white shadow-lg"
                  : "text-gray-600 hover:bg-gray-100",
                !isOpen && "justify-center"
              )}
              title={!isOpen ? item.label : undefined}
            >
              {/* Active indicator bar */}
              {active && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-emerald-400 rounded-r-full"></div>
              )}
              <Icon className={cn("w-5 h-5 flex-shrink-0", active && "font-bold")} />
              {isOpen && <span className={cn("font-bold truncate", active && "font-black")}>{item.label}</span>}
            </button>
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
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-gray-600 hover:bg-gray-100 hover:text-red-600 transition-all duration-200 font-medium"
            >
              <LogOut className="w-5 h-5" />
              <span>Logout</span>
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => navigate("/profile")}
              className="w-10 h-10 rounded-full bg-gradient-to-br from-[#4a6850] to-[#3d5643] flex items-center justify-center mx-auto mb-3"
              title={user?.name || "Profile"}
            >
              <span className="text-lg font-black text-white">
                {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
              </span>
            </button>
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center px-4 py-3 rounded-xl text-gray-600 hover:bg-gray-100 hover:text-red-600 transition-all duration-200"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
