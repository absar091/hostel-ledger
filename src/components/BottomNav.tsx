import { Home, Users, Plus, Clock, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useInvitations } from "@/hooks/useInvitations";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTranslation } from "react-i18next";

interface BottomNavProps {
  activeTab: "home" | "groups" | "add" | "activity" | "profile";
  onTabChange: (
    tab: "home" | "groups" | "add" | "activity" | "profile",
  ) => void;
}

const BottomNav = ({ activeTab, onTabChange }: BottomNavProps) => {
  const { t } = useTranslation();
  const { count: pendingInvites } = useInvitations();

  const tabDescriptions = {
    home: t('navigation.home_desc'),
    groups: t('navigation.groups_desc'),
    add: t('navigation.add_desc'),
    activity: t('navigation.activity_desc'),
    profile: t('navigation.profile_desc'),
  };

  const tabs = [
    { id: "home" as const, icon: Home, label: "Home", shortLabel: "Home", badge: pendingInvites },
    {
      id: "groups" as const,
      icon: Users,
      label: "Groups",
      shortLabel: "Groups",
    },
    {
      id: "add" as const,
      icon: Plus,
      label: t('navigation.add'),
      shortLabel: t('navigation.add_short'),
      isMain: true,
    },
    {
      id: "activity" as const,
      icon: Clock,
      label: "History",
      shortLabel: "History",
    },
    { id: "profile" as const, icon: User, label: "Me", shortLabel: "Me" },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-[#4a6850]/10 safe-area-pb z-50 shadow-[0_-10px_40px_rgba(74,104,80,0.1)]">
      <div className="max-w-lg mx-auto grid grid-cols-5 items-end gap-1 px-2 py-3">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          if (tab.isMain) {
            return (
              <Tooltip key={tab.id}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => onTabChange(tab.id)}
                    aria-current={isActive ? "page" : undefined}
                    className="touch-target w-16 h-16 -mt-8 rounded-[20px] bg-[#4B6B54] shadow-[0_8px_30px_rgba(75,107,84,0.4)] flex items-center justify-center border-4 border-white hover:bg-[#3D5643] active:scale-95 transition-all duration-200"
                  >
                    <Icon className="w-7 h-7 text-white font-bold" />
                    <span className="sr-only">{tab.label}</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent
                  side="top"
                  className="bg-[#4a6850] text-white border-[#3d5643] font-bold"
                >
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
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "touch-target relative flex flex-col items-center gap-1.5 py-2 px-2 rounded-2xl transition-all duration-200",
                    isActive
                      ? "text-[#4a6850] bg-[#4a6850]/10 scale-105"
                      : "text-gray-400 hover:text-[#4a6850]/70 hover:bg-[#4a6850]/5",
                  )}
                >
                  <Icon className={cn("w-5 h-5", isActive && "font-bold")} />
                  <span
                    className={cn(
                      "text-[11px] leading-none",
                      isActive ? "font-black" : "font-bold",
                    )}
                  >
                    {tab.shortLabel}
                  </span>

                  {/* Badge */}
                  {(tab as any).badge > 0 && (
                    <span className="absolute top-1 right-2 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>
                  )}

                  <span
                    className={cn(
                      "absolute -bottom-1 h-1 w-8 rounded-full transition-all",
                      isActive ? "bg-[#4a6850] opacity-100" : "opacity-0",
                    )}
                  />
                </button>
              </TooltipTrigger>
              <TooltipContent
                side="top"
                className="bg-[#4a6850] text-white border-[#3d5643] font-bold"
              >
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
