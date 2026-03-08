import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { WifiOff, RefreshCw, ArrowLeft, ChevronDown } from "lucide-react";
import { useFirebaseAuth } from "@/contexts/FirebaseAuthContext";
import { useSync } from "@/hooks/useSync";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import NotificationIcon from "@/components/NotificationIcon";
import PWAInstallButton from "@/components/PWAInstallButton";
import Avatar from "@/components/Avatar";
import { ReactNode } from "react";

interface MobileHeaderProps {
  title?: string;
  showBackButton?: boolean;
  rightContent?: ReactNode;
}

const MobileHeader = ({ title, showBackButton = false, rightContent }: MobileHeaderProps) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useFirebaseAuth();
  const { isOnline, pendingCount, isSyncing } = useSync();
  const { isInstalled } = usePWAInstall();
  const offline = !isOnline;

  const defaultRightContent = (
    <>
      {offline ? (
        <div className="flex items-center gap-1.5 bg-orange-50 border border-orange-200 rounded-full px-3 py-1.5">
          <WifiOff className="w-3.5 h-3.5 text-orange-600" />
          <span className="text-xs font-bold text-orange-700 hidden sm:inline">
            {t('common.offline')}
          </span>
          {pendingCount > 0 && (
            <span className="ml-1 bg-orange-600 text-white text-[10px] font-black rounded-full w-5 h-5 flex items-center justify-center">
              {pendingCount}
            </span>
          )}
        </div>
      ) : isSyncing ? (
        <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 rounded-full px-3 py-1.5">
          <RefreshCw className="w-3.5 h-3.5 text-blue-600 animate-spin" />
        </div>
      ) : pendingCount > 0 ? (
        <div className="flex items-center gap-1.5 bg-green-50 border border-green-200 rounded-full px-3 py-1.5">
          <RefreshCw className="w-3.5 h-3.5 text-green-600" />
        </div>
      ) : null}

      {isInstalled ? (
        <NotificationIcon />
      ) : (
        <PWAInstallButton />
      )}

      <button
        onClick={() => navigate("/profile")}
        className="relative group active:scale-95 transition-all"
        aria-label="View profile"
      >
        <div className="rounded-full shadow-sm overflow-hidden border border-gray-200">
          <Avatar
            name={user?.name || "User"}
            photoURL={user?.photoURL}
            size="md"
            className="w-10 h-10 object-cover"
          />
        </div>
      </button>
    </>
  );

  return (
    <header className="sticky top-0 z-50 bg-[#FAFAFA] px-5 py-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        {showBackButton ? (
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-white shadow-sm border border-gray-200 flex items-center justify-center hover:bg-gray-50 active:scale-95 transition-all"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
        ) : (
          <div className="flex flex-col cursor-pointer active:scale-95 transition-transform" onClick={() => navigate("/profile")}>
            <div className="flex items-center gap-1 text-gray-500">
              <span className="text-xs font-medium">{t('dashboard.location', { defaultValue: 'My Dashboard' })}</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </div>
            <h1 className="text-[17px] font-bold text-gray-900 tracking-tight flex items-center gap-1">
              Hi, {user?.name?.split(' ')[0] || "User"}
              <span className="text-lg">👋</span>
            </h1>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        {rightContent || defaultRightContent}
      </div>
    </header>
  );
};

export default MobileHeader;
