import { Home, Users, Plus, Clock, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface BottomNavProps {
  activeTab: "home" | "groups" | "add" | "activity" | "profile";
  onTabChange: (tab: "home" | "groups" | "add" | "activity" | "profile") => void;
}

const BottomNav = ({ activeTab, onTabChange }: BottomNavProps) => {
  const tabs = [
    { id: "home" as const, icon: Home, label: "Home" },
    { id: "groups" as const, icon: Users, label: "Groups" },
    { id: "add" as const, icon: Plus, label: "Add", isMain: true },
    { id: "activity" as const, icon: Clock, label: "Activity" },
    { id: "profile" as const, icon: User, label: "Profile" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-lg border-t border-gray-100 safe-area-pb z-50 shadow-lg">
      <div className="max-w-lg mx-auto flex items-center justify-around py-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          if (tab.isMain) {
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className="touch-target w-14 h-14 -mt-6 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 shadow-lg flex items-center justify-center border-4 border-white hover:from-emerald-600 hover:to-teal-600 transition-all"
              >
                <Icon className="w-6 h-6 text-white" />
              </button>
            );
          }

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "touch-target flex flex-col items-center gap-1 py-2 px-3 rounded-lg transition-colors",
                isActive ? "text-emerald-600" : "text-gray-400"
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
