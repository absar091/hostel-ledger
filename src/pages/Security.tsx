import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Shield, Lock, Download, Trash2, Eye, EyeOff, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import BottomNav from "@/components/BottomNav";
import Sidebar from "@/components/Sidebar";
import DesktopHeader from "@/components/DesktopHeader";
import AppContainer from "@/components/AppContainer";
import { useFirebaseAuth } from "@/contexts/FirebaseAuthContext";
import { toast } from "sonner";

const Security = () => {
  const navigate = useNavigate();
  const { user, logout } = useFirebaseAuth();
  const [activeTab, setActiveTab] = useState<"home" | "groups" | "add" | "activity" | "profile">("profile");
  
  // Change Password Sheet
  const [showChangePasswordSheet, setShowChangePasswordSheet] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Delete Account Sheet
  const [showDeleteAccountSheet, setShowDeleteAccountSheet] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");

  const handleTabChange = (tab: typeof activeTab) => {
    if (tab === "home") navigate("/");
    else if (tab === "groups") navigate("/groups");
    else if (tab === "activity") navigate("/activity");
    else if (tab === "profile") navigate("/profile");
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("Please fill in all fields");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("New passwords don't match");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    // TODO: Implement password change with Firebase
    toast.info("Password change coming soon!");
    setShowChangePasswordSheet(false);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  const handleExportData = async () => {
    toast.loading("Preparing your data...", { id: "export" });
    
    // TODO: Implement data export
    setTimeout(() => {
      toast.success("Data export coming soon!", { id: "export" });
    }, 1000);
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== "DELETE") {
      toast.error("Please type DELETE to confirm");
      return;
    }

    // TODO: Implement account deletion
    toast.error("Account deletion coming soon!");
    setShowDeleteAccountSheet(false);
    setDeleteConfirmation("");
  };

  return (
    <>
      <Sidebar />
      
      <AppContainer className="bg-white pb-20">
        <DesktopHeader />
        
        {/* Mobile Header */}
        <div className="lg:hidden fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#2f4336] via-[#4a6850] to-[#2f4336] z-50 shadow-sm"></div>
        
        <div className="bg-white border-b border-[#4a6850]/10 pt-2 pb-3 px-4 sticky top-0 z-40 shadow-[0_4px_20px_rgba(74,104,80,0.08)]">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/profile")}
              className="w-9 h-9 rounded-full bg-[#4a6850]/10 flex items-center justify-center hover:bg-[#4a6850]/20 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-[#4a6850]" />
            </button>
            <h1 className="text-xl font-black text-gray-900 tracking-tight">Security & Privacy</h1>
          </div>
        </div>

        <main className="px-4 pt-6 space-y-6">
          {/* Security Status */}
          <div className="bg-gradient-to-br from-[#4a6850]/5 to-[#3d5643]/5 rounded-3xl p-6 border border-[#4a6850]/20">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#4a6850] to-[#3d5643] flex items-center justify-center">
                <Shield className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-black text-gray-900">Account Secure</h2>
                <p className="text-sm text-[#4a6850]/80 font-medium">
                  Your account is protected
                </p>
              </div>
            </div>
          </div>

          {/* Account Security */}
          <div className="space-y-4">
            <h3 className="text-sm font-black text-[#4a6850]/80 uppercase tracking-widest px-2">Account Security</h3>
            
            <button
              onClick={() => setShowChangePasswordSheet(true)}
              className="w-full bg-white rounded-3xl p-5 flex items-center gap-4 shadow-[0_20px_60px_rgba(74,104,80,0.08)] border border-[#4a6850]/10 hover:shadow-[0_25px_70px_rgba(74,104,80,0.15)] hover:border-[#4a6850]/20 transition-all group"
            >
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Lock className="w-6 h-6 text-blue-600" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-black text-gray-900">Change Password</p>
                <p className="text-sm text-[#4a6850]/80 font-medium">Update your account password</p>
              </div>
            </button>

            <div className="bg-white rounded-3xl p-5 shadow-[0_20px_60px_rgba(74,104,80,0.08)] border border-[#4a6850]/10">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#4a6850]/20 to-[#3d5643]/20 flex items-center justify-center flex-shrink-0">
                  <Shield className="w-6 h-6 text-[#4a6850]" />
                </div>
                <div className="flex-1">
                  <p className="font-black text-gray-900 mb-1">Two-Factor Authentication</p>
                  <p className="text-sm text-[#4a6850]/80 font-medium mb-3">
                    Add an extra layer of security to your account
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toast.info("2FA coming soon!")}
                    className="h-9"
                  >
                    Enable 2FA
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Privacy & Data */}
          <div className="space-y-4">
            <h3 className="text-sm font-black text-[#4a6850]/80 uppercase tracking-widest px-2">Privacy & Data</h3>
            
            <button
              onClick={handleExportData}
              className="w-full bg-white rounded-3xl p-5 flex items-center gap-4 shadow-[0_20px_60px_rgba(74,104,80,0.08)] border border-[#4a6850]/10 hover:shadow-[0_25px_70px_rgba(74,104,80,0.15)] hover:border-[#4a6850]/20 transition-all group"
            >
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-500/20 to-cyan-500/20 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Download className="w-6 h-6 text-teal-600" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-black text-gray-900">Export Your Data</p>
                <p className="text-sm text-[#4a6850]/80 font-medium">Download all your account data</p>
              </div>
            </button>

            <button
              onClick={() => navigate("/privacy-policy")}
              className="w-full bg-white rounded-3xl p-5 flex items-center gap-4 shadow-[0_20px_60px_rgba(74,104,80,0.08)] border border-[#4a6850]/10 hover:shadow-[0_25px_70px_rgba(74,104,80,0.15)] hover:border-[#4a6850]/20 transition-all group"
            >
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500/20 to-violet-500/20 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Shield className="w-6 h-6 text-purple-600" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-black text-gray-900">Privacy Policy</p>
                <p className="text-sm text-[#4a6850]/80 font-medium">How we handle your data</p>
              </div>
            </button>
          </div>

          {/* Danger Zone */}
          <div className="space-y-4">
            <h3 className="text-sm font-black text-red-600/80 uppercase tracking-widest px-2">Danger Zone</h3>
            
            <button
              onClick={() => setShowDeleteAccountSheet(true)}
              className="w-full bg-white rounded-3xl p-5 flex items-center gap-4 shadow-[0_20px_60px_rgba(239,68,68,0.08)] border border-red-200 hover:shadow-[0_25px_70px_rgba(239,68,68,0.15)] hover:border-red-300 transition-all group"
            >
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-500/20 to-pink-500/20 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-black text-red-600">Delete Account</p>
                <p className="text-sm text-red-600/80 font-medium">Permanently delete your account and data</p>
              </div>
            </button>
          </div>

          {/* Info */}
          <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200">
            <p className="text-xs text-gray-600 leading-relaxed">
              <strong className="text-gray-900">Security Tip:</strong> Use a strong, unique password and enable 
              two-factor authentication to keep your account secure.
            </p>
          </div>
        </main>

        <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />
      </AppContainer>

      {/* Change Password Sheet */}
      <Sheet open={showChangePasswordSheet} onOpenChange={setShowChangePasswordSheet}>
        <SheetContent side="bottom" className="h-auto rounded-t-3xl">
          <SheetHeader className="mb-6">
            <SheetTitle className="text-center">Change Password</SheetTitle>
            <SheetDescription className="text-center text-sm text-gray-500">
              Enter your current password and choose a new one
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4 pb-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Current Password</label>
              <div className="relative">
                <Input
                  type={showCurrentPassword ? "text" : "password"}
                  placeholder="Enter current password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="h-12 pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">New Password</label>
              <div className="relative">
                <Input
                  type={showNewPassword ? "text" : "password"}
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="h-12 pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Confirm New Password</label>
              <div className="relative">
                <Input
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="h-12 pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <Button onClick={handleChangePassword} className="w-full h-12 mt-6">
              Change Password
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Account Sheet */}
      <Sheet open={showDeleteAccountSheet} onOpenChange={setShowDeleteAccountSheet}>
        <SheetContent side="bottom" className="h-auto rounded-t-3xl">
          <SheetHeader className="mb-6">
            <SheetTitle className="text-center text-red-600">Delete Account</SheetTitle>
            <SheetDescription className="text-center text-sm text-gray-500">
              This action cannot be undone
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4 pb-4">
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-red-900 text-sm">Warning</p>
                  <p className="text-xs text-red-700 mt-1">
                    Deleting your account will permanently remove all your data, including groups, 
                    expenses, and payment history. This action cannot be undone.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                Type <strong>DELETE</strong> to confirm
              </label>
              <Input
                type="text"
                placeholder="DELETE"
                value={deleteConfirmation}
                onChange={(e) => setDeleteConfirmation(e.target.value)}
                className="h-12"
              />
            </div>

            <Button
              onClick={handleDeleteAccount}
              variant="destructive"
              className="w-full h-12 mt-6"
              disabled={deleteConfirmation !== "DELETE"}
            >
              Delete My Account
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default Security;
