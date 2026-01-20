import { Search, Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useFirebaseAuth } from "@/contexts/FirebaseAuthContext";
import NotificationIcon from "./NotificationIcon";

const DesktopHeader = () => {
  const navigate = useNavigate();
  const { user } = useFirebaseAuth();

  return (
    <header className="hidden lg:flex sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-200 px-8 py-4 items-center justify-between">
      {/* Search Bar */}
      <div className="flex-1 max-w-xl">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search transactions, groups, or members..."
            className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#4a6850] focus:border-transparent transition-all"
          />
        </div>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-4 ml-6">
        {/* Notifications */}
        <button className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-all">
          <NotificationIcon />
        </button>

        {/* Profile */}
        <button
          onClick={() => navigate("/profile")}
          className="flex items-center gap-3 px-4 py-2 rounded-xl hover:bg-gray-50 transition-all"
        >
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#4a6850] to-[#3d5643] flex items-center justify-center">
            <span className="text-lg font-black text-white">
              {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
            </span>
          </div>
          <div className="text-left">
            <p className="text-sm font-black text-gray-900">{user?.name || "User"}</p>
            <p className="text-xs text-gray-500">View Profile</p>
          </div>
        </button>
      </div>
    </header>
  );
};

export default DesktopHeader;
