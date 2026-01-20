import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFirebaseAuth, PaymentDetails } from "@/contexts/FirebaseAuthContext";
import { toast } from "sonner";
import { 
  User, Phone, CreditCard, Building2, LogOut, Check, ChevronRight,
  Bell, Shield, HelpCircle, Info, Mail, Calendar, Camera, X, Loader2
} from "lucide-react";
import Avatar from "@/components/Avatar";
import BottomNav from "@/components/BottomNav";
import PWAInstallButton from "@/components/PWAInstallButton";
import ShareButton from "@/components/ShareButton";
import LogoutConfirmDialog from "@/components/LogoutConfirmDialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Tooltip from "@/components/Tooltip";

const BANKS = [
  "Allied Bank",
  "Askari Bank",
  "Bank Alfalah",
  "Bank Al Habib",
  "Faysal Bank",
  "Habib Bank Limited (HBL)",
  "JS Bank",
  "MCB Bank",
  "Meezan Bank",
  "National Bank of Pakistan",
  "Standard Chartered",
  "UBL",
  "Other",
];

const Profile = () => {
  const navigate = useNavigate();
  const { user, updateUserProfile, logout, uploadProfilePicture, removeProfilePicture } = useFirebaseAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<"home" | "groups" | "add" | "activity" | "profile">("profile");
  const [showEditSheet, setShowEditSheet] = useState(false);
  const [showPaymentSheet, setShowPaymentSheet] = useState(false);
  const [showPhotoOptionsSheet, setShowPhotoOptionsSheet] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  
  // Edit form state
  const [editName, setEditName] = useState(user?.name || "");
  const [editPhone, setEditPhone] = useState(user?.phone || "");
  
  // Payment details state
  const [jazzCash, setJazzCash] = useState(user?.paymentDetails?.jazzCash || "");
  const [easypaisa, setEasypaisa] = useState(user?.paymentDetails?.easypaisa || "");
  const [bankName, setBankName] = useState(user?.paymentDetails?.bankName || "");
  const [accountNumber, setAccountNumber] = useState(user?.paymentDetails?.accountNumber || "");
  const [raastId, setRaastId] = useState(user?.paymentDetails?.raastId || "");

  const handleTabChange = (tab: "home" | "groups" | "add" | "activity" | "profile") => {
    setActiveTab(tab);
    if (tab === "home") navigate("/");
    else if (tab === "groups") navigate("/groups");
    else if (tab === "activity") navigate("/activity");
    else if (tab === "profile") navigate("/profile");
  };

  const handleSaveProfile = async () => {
    const result = await updateUserProfile({ name: editName, phone: editPhone || null });
    if (result.success) {
      toast.success("Profile updated");
      setShowEditSheet(false);
    } else {
      toast.error(result.error || "Failed to update profile");
    }
  };

  const handleSavePaymentDetails = async () => {
    const paymentDetails: PaymentDetails = {};
    if (jazzCash) paymentDetails.jazzCash = jazzCash;
    if (easypaisa) paymentDetails.easypaisa = easypaisa;
    if (bankName) paymentDetails.bankName = bankName;
    if (accountNumber) paymentDetails.accountNumber = accountNumber;
    if (raastId) paymentDetails.raastId = raastId;
    
    const result = await updateUserProfile({ paymentDetails });
    if (result.success) {
      toast.success("Payment details updated");
      setShowPaymentSheet(false);
    } else {
      toast.error(result.error || "Failed to update payment details");
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
    toast.success("Logged out successfully");
  };

  const handleLogoutClick = () => {
    setShowLogoutDialog(true);
  };

  const handlePhotoClick = () => {
    setShowPhotoOptionsSheet(true);
  };

  const handleChangePhoto = () => {
    setShowPhotoOptionsSheet(false);
    fileInputRef.current?.click();
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error("Please select an image file");
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size must be less than 5MB");
      return;
    }

    setIsUploadingPhoto(true);
    toast.loading("Uploading profile picture...", { id: "upload-photo" });

    try {
      const result = await uploadProfilePicture(file);
      
      if (result.success) {
        toast.success("Profile picture updated!", { id: "upload-photo" });
      } else {
        toast.error(result.error || "Failed to upload picture", { id: "upload-photo" });
      }
    } catch (error) {
      toast.error("Failed to upload picture", { id: "upload-photo" });
    } finally {
      setIsUploadingPhoto(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemovePhoto = async () => {
    if (!user?.photoURL) return;

    setShowPhotoOptionsSheet(false);
    toast.loading("Removing profile picture...", { id: "remove-photo" });

    try {
      const result = await removeProfilePicture();
      
      if (result.success) {
        toast.success("Profile picture removed", { id: "remove-photo" });
      } else {
        toast.error(result.error || "Failed to remove picture", { id: "remove-photo" });
      }
    } catch (error) {
      toast.error("Failed to remove picture", { id: "remove-photo" });
    }
  };

  const hasPaymentDetails = user?.paymentDetails && Object.keys(user.paymentDetails).length > 0;
  const memberSince = user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'Recently';

  return (
    <div className="min-h-screen bg-white pb-20">
      {/* iPhone-style top accent border */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#2f4336] via-[#4a6850] to-[#2f4336] z-50 shadow-sm"></div>
      
      {/* App Header - iPhone Style Enhanced with #4a6850 */}
      <div className="bg-white border-b border-[#4a6850]/10 pt-2 pb-3 px-4 sticky top-0 z-40 shadow-[0_4px_20px_rgba(74,104,80,0.08)]">
        <div className="flex items-center justify-between">
          {/* App Logo and Name - Enhanced */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-[#4a6850] to-[#3d5643] rounded-2xl flex items-center justify-center shadow-lg">
              <img
                src="/only-logo.png"
                alt="Hostel Ledger"
                className="w-6 h-6 object-contain filter brightness-0 invert"
              />
            </div>
            <h1 className="text-xl font-black text-gray-900 tracking-tight">Hostel Ledger</h1>
          </div>
          
          {/* Header Actions - Enhanced */}
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 bg-gradient-to-br from-[#4a6850] to-[#3d5643] rounded-3xl flex items-center justify-center shadow-lg">
              <User className="w-7 h-7 text-white font-bold" />
            </div>
          </div>
        </div>
      </div>

      {/* Header - iPhone Style Enhanced */}
      <header className="px-4 pt-8 pb-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Profile</h1>
          <div className="flex items-center gap-3">
            <ShareButton variant="icon" />
            <PWAInstallButton />
          </div>
        </div>

        {/* Profile Card - iPhone Style with #4a6850 */}
        <div className="bg-white rounded-3xl p-7 shadow-[0_25px_70px_rgba(74,104,80,0.15)] animate-fade-in border border-[#4a6850]/10">
          <div className="flex items-start gap-5 mb-5">
            {/* Avatar - Enhanced iPhone Style */}
            <button
              onClick={handlePhotoClick}
              disabled={isUploadingPhoto}
              className="relative group cursor-pointer"
            >
              <div className="relative">
                <Avatar name={user?.name || "User"} photoURL={user?.photoURL} size="xl" />
                
                {/* Status Indicator */}
                <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-gradient-to-br from-[#4a6850] to-[#3d5643] rounded-full flex items-center justify-center shadow-lg border-3 border-white">
                  <div className="w-2.5 h-2.5 bg-white rounded-full"></div>
                </div>
              </div>
              
              {/* Camera Icon Overlay - Enhanced */}
              <div className="absolute inset-0 bg-[#4a6850]/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200">
                {isUploadingPhoto ? (
                  <Loader2 className="w-7 h-7 text-white animate-spin" />
                ) : (
                  <Camera className="w-7 h-7 text-white font-bold" />
                )}
              </div>
            </button>

            {/* Hidden File Input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
              className="hidden"
            />

            <div className="flex-1">
              <h2 className="text-2xl font-black text-gray-900 tracking-tight mb-1">{user?.name}</h2>
              <p className="text-[#4a6850]/80 text-sm flex items-center gap-2 mt-1 font-bold">
                <Mail className="w-4 h-4" />
                {user?.email}
              </p>
              {user?.phone && (
                <p className="text-[#4a6850]/80 text-sm flex items-center gap-2 mt-1 font-bold">
                  <Phone className="w-4 h-4" />
                  {user.phone}
                </p>
              )}
              <p className="text-[#4a6850]/60 text-xs flex items-center gap-2 mt-3 font-black">
                <Calendar className="w-4 h-4" />
                Member since {memberSince}
              </p>
            </div>
          </div>
          
          {/* Quick Stats - Enhanced iPhone Style */}
          <div className="grid grid-cols-2 gap-4 mt-5 pt-5 border-t border-[#4a6850]/10">
            <div className="bg-[#4a6850]/5 rounded-2xl p-4 border border-[#4a6850]/10">
              <p className="text-[#4a6850]/70 text-xs font-black uppercase tracking-wide">Email Status</p>
              <p className="font-black text-sm flex items-center gap-2 mt-2 text-[#4a6850]">
                <Check className="w-4 h-4" />
                Verified
              </p>
            </div>
            <div className="bg-[#4a6850]/5 rounded-2xl p-4 border border-[#4a6850]/10">
              <p className="text-[#4a6850]/70 text-xs font-black uppercase tracking-wide">Payment Methods</p>
              <p className="font-black text-sm mt-2 text-gray-900">
                {hasPaymentDetails ? Object.keys(user?.paymentDetails || {}).length : 0} Added
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="px-4 space-y-6">
        {/* Account Section - iPhone Style Enhanced */}
        <div className="space-y-4">
          <h3 className="text-sm font-black text-[#4a6850]/80 uppercase tracking-widest px-2">Account</h3>
          
          <button
            onClick={() => {
              setEditName(user?.name || "");
              setEditPhone(user?.phone || "");
              setShowEditSheet(true);
            }}
            className="w-full bg-white rounded-3xl p-5 flex items-center gap-4 shadow-[0_20px_60px_rgba(74,104,80,0.08)] border border-[#4a6850]/10 hover:shadow-[0_25px_70px_rgba(74,104,80,0.15)] hover:border-[#4a6850]/20 transition-all animate-slide-up group"
            style={{ animationDelay: "0.05s" }}
          >
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#4a6850]/20 to-[#3d5643]/20 flex items-center justify-center group-hover:scale-105 transition-transform">
              <User className="w-6 h-6 text-[#4a6850] font-bold" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-black text-gray-900 tracking-tight">Edit Profile</p>
              <p className="text-sm text-[#4a6850]/80 font-bold">Update your name and phone</p>
            </div>
            <ChevronRight className="w-5 h-5 text-[#4a6850]/60 group-hover:text-[#4a6850] transition-colors" />
          </button>

          <button
            onClick={() => {
              setJazzCash(user?.paymentDetails?.jazzCash || "");
              setEasypaisa(user?.paymentDetails?.easypaisa || "");
              setBankName(user?.paymentDetails?.bankName || "");
              setAccountNumber(user?.paymentDetails?.accountNumber || "");
              setRaastId(user?.paymentDetails?.raastId || "");
              setShowPaymentSheet(true);
            }}
            className="w-full bg-white rounded-3xl p-5 flex items-center gap-4 shadow-[0_20px_60px_rgba(74,104,80,0.08)] border border-[#4a6850]/10 hover:shadow-[0_25px_70px_rgba(74,104,80,0.15)] hover:border-[#4a6850]/20 transition-all animate-slide-up group"
            style={{ animationDelay: "0.1s" }}
          >
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 flex items-center justify-center group-hover:scale-105 transition-transform">
              <CreditCard className="w-6 h-6 text-blue-600 font-bold" />
            </div>
            <div className="flex-1 text-left">
              <div className="flex items-center gap-3">
                <p className="font-black text-gray-900 tracking-tight">Payment Details</p>
                {hasPaymentDetails && (
                  <div className="w-6 h-6 rounded-full bg-[#4a6850] flex items-center justify-center shadow-sm">
                    <Check className="w-3.5 h-3.5 text-white font-bold" />
                  </div>
                )}
              </div>
              <p className="text-sm text-[#4a6850]/80 font-bold">
                {hasPaymentDetails ? `${Object.keys(user?.paymentDetails || {}).length} methods added` : "Add payment methods"}
              </p>
            </div>
            <ChevronRight className="w-5 h-5 text-[#4a6850]/60 group-hover:text-[#4a6850] transition-colors" />
          </button>
        </div>

        {/* Share Section */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide px-2">Share & Connect</h3>
          
          <ShareButton 
            variant="card" 
            className="animate-slide-up" 
          />
        </div>

        {/* Preferences Section - iPhone Style Enhanced */}
        <div className="space-y-4">
          <h3 className="text-sm font-black text-[#4a6850]/80 uppercase tracking-widest px-2">Preferences</h3>
          
          <button
            onClick={() => toast.info("Notification settings coming soon!")}
            className="w-full bg-white rounded-3xl p-5 flex items-center gap-4 shadow-[0_20px_60px_rgba(74,104,80,0.08)] border border-[#4a6850]/10 hover:shadow-[0_25px_70px_rgba(74,104,80,0.15)] hover:border-[#4a6850]/20 transition-all animate-slide-up group"
            style={{ animationDelay: "0.15s" }}
          >
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500/20 to-violet-500/20 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Bell className="w-6 h-6 text-purple-600 font-bold" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-black text-gray-900 tracking-tight">Notifications</p>
              <p className="text-sm text-[#4a6850]/80 font-bold">Manage email and push notifications</p>
            </div>
            <ChevronRight className="w-5 h-5 text-[#4a6850]/60 group-hover:text-[#4a6850] transition-colors" />
          </button>

          <button
            onClick={() => toast.info("Security settings coming soon!")}
            className="w-full bg-white rounded-3xl p-5 flex items-center gap-4 shadow-[0_20px_60px_rgba(74,104,80,0.08)] border border-[#4a6850]/10 hover:shadow-[0_25px_70px_rgba(74,104,80,0.15)] hover:border-[#4a6850]/20 transition-all animate-slide-up group"
            style={{ animationDelay: "0.2s" }}
          >
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500/20 to-red-500/20 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Shield className="w-6 h-6 text-orange-600 font-bold" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-black text-gray-900 tracking-tight">Security & Privacy</p>
              <p className="text-sm text-[#4a6850]/80 font-bold">Password, data export, delete account</p>
            </div>
            <ChevronRight className="w-5 h-5 text-[#4a6850]/60 group-hover:text-[#4a6850] transition-colors" />
          </button>
        </div>

        {/* Support Section - iPhone Style Enhanced */}
        <div className="space-y-4">
          <h3 className="text-sm font-black text-[#4a6850]/80 uppercase tracking-widest px-2">Support</h3>
          
          <button
            onClick={() => navigate("/about")}
            className="w-full bg-white rounded-3xl p-5 flex items-center gap-4 shadow-[0_20px_60px_rgba(74,104,80,0.08)] border border-[#4a6850]/10 hover:shadow-[0_25px_70px_rgba(74,104,80,0.15)] hover:border-[#4a6850]/20 transition-all animate-slide-up group"
            style={{ animationDelay: "0.25s" }}
          >
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#4a6850]/20 to-[#3d5643]/20 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Info className="w-6 h-6 text-[#4a6850] font-bold" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-black text-gray-900 tracking-tight">About</p>
              <p className="text-sm text-[#4a6850]/80 font-bold">Version, terms, privacy policy</p>
            </div>
            <ChevronRight className="w-5 h-5 text-[#4a6850]/60 group-hover:text-[#4a6850] transition-colors" />
          </button>

          <a
            href="mailto:support@aarx.online"
            className="w-full bg-white rounded-3xl p-5 flex items-center gap-4 shadow-[0_20px_60px_rgba(74,104,80,0.08)] border border-[#4a6850]/10 hover:shadow-[0_25px_70px_rgba(74,104,80,0.15)] hover:border-[#4a6850]/20 transition-all animate-slide-up group"
            style={{ animationDelay: "0.3s" }}
          >
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-500/20 to-cyan-500/20 flex items-center justify-center group-hover:scale-105 transition-transform">
              <HelpCircle className="w-6 h-6 text-teal-600 font-bold" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-black text-gray-900 tracking-tight">Help & Support</p>
              <p className="text-sm text-[#4a6850]/80 font-bold">Contact us for assistance</p>
            </div>
            <ChevronRight className="w-5 h-5 text-[#4a6850]/60 group-hover:text-[#4a6850] transition-colors" />
          </a>

          <button
            onClick={async () => {
              if (confirm('Clear app cache? This will refresh the app with the latest version.')) {
                try {
                  // Clear all caches
                  if ('caches' in window) {
                    const cacheNames = await caches.keys();
                    await Promise.all(cacheNames.map(name => caches.delete(name)));
                  }
                  
                  // Unregister service workers
                  if ('serviceWorker' in navigator) {
                    const registrations = await navigator.serviceWorker.getRegistrations();
                    await Promise.all(registrations.map(reg => reg.unregister()));
                  }
                  
                  toast.success("Cache cleared! Reloading app...");
                  setTimeout(() => window.location.reload(), 1000);
                } catch (error) {
                  toast.error("Failed to clear cache");
                  console.error('Cache clear error:', error);
                }
              }
            }}
            className="w-full bg-white rounded-3xl p-5 flex items-center gap-4 shadow-[0_20px_60px_rgba(74,104,80,0.08)] border border-[#4a6850]/10 hover:shadow-[0_25px_70px_rgba(74,104,80,0.15)] hover:border-[#4a6850]/20 transition-all animate-slide-up group"
            style={{ animationDelay: "0.35s" }}
          >
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500/20 to-yellow-500/20 flex items-center justify-center group-hover:scale-105 transition-transform">
              <svg className="w-6 h-6 text-amber-600 font-bold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <div className="flex-1 text-left">
              <p className="font-black text-gray-900 tracking-tight">Clear Cache</p>
              <p className="text-sm text-[#4a6850]/80 font-bold">Fix loading issues and get latest version</p>
            </div>
            <ChevronRight className="w-5 h-5 text-[#4a6850]/60 group-hover:text-[#4a6850] transition-colors" />
          </button>
        </div>

        {/* Logout - iPhone Style Enhanced */}
        <button
          onClick={handleLogoutClick}
          className="w-full bg-white rounded-3xl p-5 flex items-center gap-4 animate-slide-up border border-red-200/50 hover:shadow-[0_25px_70px_rgba(239,68,68,0.15)] hover:border-red-300 transition-all group"
          style={{ animationDelay: "0.35s" }}
        >
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-500/20 to-pink-500/20 flex items-center justify-center group-hover:scale-105 transition-transform">
            <LogOut className="w-6 h-6 text-red-600 font-bold" />
          </div>
          <p className="font-black text-red-600 tracking-tight">Log Out</p>
        </button>

        {/* App Version */}
        <div className="text-center py-4">
          <p className="text-xs text-gray-400 mb-3">Hostel Ledger v1.0.0</p>
          <div className="flex items-center justify-center gap-2">
            <p className="text-xs text-gray-500">A Product By</p>
            <a 
              href="https://aarx.online" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-block hover:opacity-80 transition-opacity"
            >
              <img 
                src="https://hostel-ledger.vercel.app/real-aarx-logo.png" 
                alt="AARX Labs" 
                className="h-6 w-auto"
              />
            </a>
            <span className="text-gray-900 font-semibold text-xs">Labs</span>
          </div>
        </div>
      </main>

      {/* Bottom Navigation */}
      <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />

      {/* Logout Confirmation Dialog */}
      <LogoutConfirmDialog
        open={showLogoutDialog}
        onOpenChange={setShowLogoutDialog}
        onConfirm={handleLogout}
      />

      {/* Edit Profile Sheet */}
      <Sheet open={showEditSheet} onOpenChange={setShowEditSheet}>
        <SheetContent side="bottom" className="h-auto rounded-t-3xl flex flex-col">
          <SheetHeader className="flex-shrink-0 mb-4">
            <SheetTitle className="text-center">Edit Profile</SheetTitle>
            <SheetDescription className="text-center text-sm text-gray-500">
              Update your personal information
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4 pb-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Full Name</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Your name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="h-12 pl-12"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="tel"
                  placeholder="03XX-XXXXXXX"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="h-12 pl-12"
                />
              </div>
            </div>
          </div>

          <div className="flex-shrink-0 pt-4 border-t bg-background">
            <Button onClick={handleSaveProfile} className="w-full h-12">
              Save Changes
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Payment Details Sheet */}
      <Sheet open={showPaymentSheet} onOpenChange={setShowPaymentSheet}>
        <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl flex flex-col">
          <SheetHeader className="flex-shrink-0 mb-4">
            <SheetTitle className="text-center">Payment Details</SheetTitle>
            <SheetDescription className="text-center text-sm text-gray-500">
              Add your payment methods for group settlements
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto space-y-6 pb-4">
            <div className="flex items-center gap-2 justify-center">
              <p className="text-sm text-muted-foreground text-center">
                Add your payment details so group members know how to settle expenses with you
              </p>
              <Tooltip 
                content="These details will be visible to your group members when they need to pay you back for shared expenses."
                position="top"
              />
            </div>

            {/* Mobile Wallets */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground">Mobile Wallets</h3>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">JazzCash Number</label>
                <Input
                  type="tel"
                  placeholder="03XX-XXXXXXX"
                  value={jazzCash}
                  onChange={(e) => setJazzCash(e.target.value)}
                  className="h-12"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Easypaisa Number</label>
                <Input
                  type="tel"
                  placeholder="03XX-XXXXXXX"
                  value={easypaisa}
                  onChange={(e) => setEasypaisa(e.target.value)}
                  className="h-12"
                />
              </div>
            </div>

            {/* Bank Account */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground">Bank Account</h3>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Bank Name</label>
                <Select value={bankName} onValueChange={setBankName}>
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Select your bank" />
                  </SelectTrigger>
                  <SelectContent>
                    {BANKS.map((bank) => (
                      <SelectItem key={bank} value={bank}>
                        {bank}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Account Number / IBAN</label>
                <div className="relative">
                  <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Enter account number"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    className="h-12 pl-12"
                  />
                </div>
              </div>
            </div>

            {/* Raast */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground">Raast</h3>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Raast ID</label>
                <Input
                  type="text"
                  placeholder="Your Raast ID (phone/CNIC)"
                  value={raastId}
                  onChange={(e) => setRaastId(e.target.value)}
                  className="h-12"
                />
              </div>
            </div>
          </div>

          <div className="flex-shrink-0 pt-4 border-t bg-background">
            <Button onClick={handleSavePaymentDetails} className="w-full h-12">
              Save Payment Details
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Photo Options Sheet */}
      <Sheet open={showPhotoOptionsSheet} onOpenChange={setShowPhotoOptionsSheet}>
        <SheetContent side="bottom" className="h-auto rounded-t-3xl">
          <SheetHeader className="mb-6">
            <SheetTitle className="text-center">Profile Picture</SheetTitle>
            <SheetDescription className="text-center text-sm text-gray-500">
              Choose an option
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-3 pb-4">
            <Button
              onClick={handleChangePhoto}
              className="w-full h-14 bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center gap-3"
            >
              <Camera className="w-5 h-5" />
              {user?.photoURL ? "Change Picture" : "Upload Picture"}
            </Button>

            {user?.photoURL && (
              <Button
                onClick={handleRemovePhoto}
                variant="outline"
                className="w-full h-14 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 flex items-center justify-center gap-3"
              >
                <X className="w-5 h-5" />
                Remove Picture
              </Button>
            )}

            <Button
              onClick={() => setShowPhotoOptionsSheet(false)}
              variant="secondary"
              className="w-full h-14"
            >
              Cancel
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default Profile;
