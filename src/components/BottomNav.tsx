import { Home, Users, Plus, Clock, User } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface BottomNavProps {
  activeTab: "home" | "groups" | "add" | "activity" | "profile";
  onTabChange: (tab: "home" | "groups" | "add" | "activity" | "profile") => void;
}

const tabDescriptions = {
  home: "View your dashboard with wallet balance and quick actions",
  groups: "Manage your expense sharing groups",
  add: "Add a new expense to split with your group",
  activity: "View recent transactions and payment history",
  profile: "Manage your profile and payment details",
};

const BottomNav = ({ activeTab, onTabChange }: BottomNavProps) => {
  const tabs = [
    { id: "home" as const, icon: Home, label: "Home" },
    { id: "groups" as const, icon: Users, label: "Groups" },
    { id: "add" as const, icon: Plus, label: "Add", isMain: true },
    { id: "activity" as const, icon: Clock, label: "Activity" },
    { id: "profile" as const, icon: User, label: "Profile" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-[#4a6850]/10 safe-area-pb z-50 shadow-[0_-10px_40px_rgba(74,104,80,0.1)]">
      <div className="max-w-lg mx-auto flex items-center justify-around py-3">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            if (tab.isMain) {
              return (
                <Tooltip key={tab.id}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => onTabChange(tab.id)}
                      className="touch-target w-16 h-16 -mt-8 rounded-3xl bg-gradient-to-br from-[#4a6850] to-[#3d5643] shadow-[0_20px_60px_rgba(74,104,80,0.4)] flex items-center justify-center border-4 border-white hover:from-[#3d5643] hover:to-[#2f4336] hover:scale-105 active:scale-95 transition-all duration-200"
                    >
                      <Icon className="w-7 h-7 text-white font-bold" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="bg-[#4a6850] text-white border-[#3d5643] font-bold">
                    <p>{tabDescriptions[tab.id]}</p>
                  </TooltipContent>
                </Tooltip>
              );
            }

            return (
              <Tooltip key={tab.id}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => onTabChange(tab.id)}
                    className={cn(
                      "touch-target flex flex-col items-center gap-1.5 py-2 px-4 rounded-2xl transition-all duration-200",
                      isActive 
                        ? "text-[#4a6850] bg-[#4a6850]/10 scale-105" 
                        : "text-gray-400 hover:text-[#4a6850]/70 hover:bg-[#4a6850]/5"
                    )}
                  >
                    <Icon className={cn("w-5 h-5", isActive && "font-bold")} />
                    <span className={cn("text-xs", isActive ? "font-black" : "font-bold")}>{tab.label}</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="bg-[#4a6850] text-white border-[#3d5643] font-bold">
                  <p>{tabDescriptions[tab.id]}</p>
                </TooltipContent>
              </Tooltip>
            );
          })}
      </div>
    </nav>
  );
};

export default BottomNav;
