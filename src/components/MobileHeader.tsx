import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { WifiOff, RefreshCw, ArrowLeft } from "@/lib/icons";
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
      {/* Offline/Sync Indicator - Auto-syncs in background */}
      {offline ? (
        <div className="flex items-center gap-1.5 bg-orange-50 border border-orange-200 rounded-full px-3 py-1.5">
          <WifiOff className="w-3.5 h-3.5 text-orange-600" />
          <span className="text-xs font-bold text-orange-700">
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
          <span className="text-xs font-bold text-blue-700">
            {t('common.syncing')}
          </span>
        </div>
      ) : pendingCount > 0 ? (
        <div className="flex items-center gap-1.5 bg-green-50 border border-green-200 rounded-full px-3 py-1.5">
          <RefreshCw className="w-3.5 h-3.5 text-green-600" />
          <span className="text-xs font-bold text-green-700">
            {pendingCount} pending
          </span>
        </div>
      ) : null}

      {isInstalled ? (
        <NotificationIcon />
      ) : (
        <PWAInstallButton />
      )}

      <button
        onClick={() => navigate("/profile")}
        className="relative group"
        aria-label="View profile"
      >
        <div className="rounded-full ring-2 ring-white shadow-lg overflow-hidden">
          <Avatar
            name={user?.name || "User"}
            photoURL={user?.photoURL}
            size="md"
            className="w-10 h-10"
          />
        </div>
      </button>
    </>
  );

  return (
    <header className="lg:hidden sticky top-0 z-50 bg-[#F8F9FA]/80 backdrop-blur-md px-6 py-4 flex items-center justify-between border-b border-gray-100">
      <div className="flex items-center gap-3">
        {showBackButton ? (
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-xl bg-white shadow-sm border border-gray-100 flex items-center justify-center hover:bg-gray-50 active:scale-95 transition-all"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
        ) : (
          <img
            src="/only-logo.png"
            alt="Hostel Ledger"
            className="w-10 h-10 rounded-xl shadow-lg"
          />
        )}

        <div className="min-w-0 flex-1">
          {title ? (
            <h1 className="text-lg font-black text-gray-900 tracking-tight truncate">
              {title}
            </h1>
          ) : (
            <h1 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">
              HOSTEL LEDGER
            </h1>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        {rightContent || defaultRightContent}
      </div>
    </header>
  );
};

export default MobileHeader;
