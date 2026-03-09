import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Bell, ArrowLeft } from "lucide-react";
import { useFirebaseAuth } from "@/contexts/FirebaseAuthContext";
import Avatar from "@/components/Avatar";
import { ReactNode } from "react";

interface MobileHeaderProps {
  title?: string;
  showBackButton?: boolean;
  rightContent?: ReactNode;
  hideGreeting?: boolean;
}

const MobileHeader = ({ title, showBackButton = false, rightContent, hideGreeting = false }: MobileHeaderProps) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useFirebaseAuth();

  return (
    <div className="flex flex-col flex-shrink-0 bg-[#e8e8e8]">
      {/* Header Container */}
      <div className="flex justify-between items-center px-5 pt-4 pb-2">
        {/* Left: Logo & Wordmark */}
        <div className="flex items-center gap-2 cursor-pointer active:opacity-70 transition-opacity" onClick={() => navigate("/")}>
          {showBackButton ? (
            <button
              onClick={(e) => { e.stopPropagation(); navigate(-1); }}
              className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm border border-gray-200"
              aria-label="Go back"
            >
              <ArrowLeft className="w-4 h-4 text-gray-700" />
            </button>
          ) : (
            <img src="/only-logo.png" alt="Hostel Ledger Logo" className="w-8 h-8 object-contain" />
          )}
          {!showBackButton && (
            <span className="font-bold text-[13px] tracking-[1.5px] text-[#222]">
              HOSTEL LEDGER
            </span>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2.5">
          {rightContent || (
            <>
              {/* Notification Bell */}
              <button
                onClick={() => navigate("/activity")}
                className="w-9 h-9 rounded-full border-[1.5px] border-[#ddd] bg-white flex items-center justify-center active:scale-95 transition-transform"
                aria-label="Notifications"
              >
                <Bell className="w-[18px] h-[18px] text-[#888]" strokeWidth={2} />
              </button>

              {/* Profile Avatar */}
              <button
                onClick={() => navigate("/profile")}
                className="w-[38px] h-[38px] rounded-full overflow-hidden border-2 border-[#ddd] bg-[#c8a882] flex items-center justify-center active:scale-95 transition-transform"
                aria-label="View profile"
              >
                <Avatar
                  name={user?.name || "User"}
                  photoURL={user?.photoURL}
                  size="md"
                  className="w-full h-full object-cover"
                />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default MobileHeader;
