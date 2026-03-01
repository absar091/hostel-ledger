import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFirebaseAuth, PaymentDetails } from "@/contexts/FirebaseAuthContext";
import { toast } from "sonner";
import {
  User, Phone, CreditCard, Building2, LogOut, Check, ChevronRight,
  Bell, Shield, HelpCircle, Info, Mail, Calendar, Camera, X, Loader2,
  Settings
} from "lucide-react";
import Avatar from "@/components/Avatar";
import BottomNav from "@/components/BottomNav";
import Sidebar from "@/components/Sidebar";
import DesktopHeader from "@/components/DesktopHeader";
import MobileHeader from "@/components/MobileHeader";
import AppContainer from "@/components/AppContainer";
import PWAInstallButton from "@/components/PWAInstallButton";
import ShareButton from "@/components/ShareButton";
import LogoutConfirmDialog from "@/components/LogoutConfirmDialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Tooltip from "@/components/Tooltip";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation();
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
      toast.success(t('profile.profile_updated'));
      setShowEditSheet(false);
    } else {
      toast.error(result.error || t('common.error'));
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
      toast.success(t('profile.payment_details_updated'));
      setShowPaymentSheet(false);
    } else {
      toast.error(result.error || t('common.error'));
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
    toast.success(t('settings.logout_success'));
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
    toast.loading(t('profile.uploading_photo'), { id: "upload-photo" });

    try {
      const result = await uploadProfilePicture(file);

      if (result.success) {
        toast.success(t('profile.photo_updated'), { id: "upload-photo" });
      } else {
        toast.error(result.error || t('common.error'), { id: "upload-photo" });
      }
    } catch (error) {
      toast.error(t('common.error'), { id: "upload-photo" });
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
    toast.loading(t('profile.removing_photo'), { id: "remove-photo" });

    try {
      const result = await removeProfilePicture();

      if (result.success) {
        toast.success(t('profile.photo_removed'), { id: "remove-photo" });
      } else {
        toast.error(result.error || t('common.error'), { id: "remove-photo" });
      }
    } catch (error) {
      toast.error(t('common.error'), { id: "remove-photo" });
    }
  };

  const hasPaymentDetails = user?.paymentDetails && Object.keys(user.paymentDetails).length > 0;
  const memberSince = user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'Recently';

  return (
    <>
      {/* Desktop Sidebar */}
      <Sidebar />

      <AppContainer className="bg-white pb-20">
        {/* Desktop Header */}
        <DesktopHeader />

        {/* Mobile Header */}
        <MobileHeader />

        {/* Header - iPhone Style Enhanced */}
        <header className="px-4 pt-6 lg:pt-8 pb-4 lg:pb-6">
          <div className="flex items-center justify-between mb-4 lg:mb-6">
            <h1 className="text-2xl lg:text-3xl font-black text-gray-900 tracking-tight">{t('profile.title')}</h1>
            <div className="flex items-center gap-2 lg:gap-3">
              <ShareButton variant="icon" />
              <PWAInstallButton />
            </div>
          </div>

          {/* Profile Card - White iPhone Style */}
          <div className="bg-white rounded-[2rem] shadow-[0_20px_60px_rgba(74,104,80,0.08)] border border-[#4a6850]/5 overflow-hidden animate-fade-in">

            <div className="p-6 lg:p-8">
              <div className="flex items-start gap-5 lg:gap-6">
                {/* Avatar */}
                <button
                  onClick={handlePhotoClick}
                  aria-label="Change profile photo"
                  disabled={isUploadingPhoto}
                  className="relative group cursor-pointer flex-shrink-0"
                >
                  <div className="relative">
                    <div className="ring-[3px] ring-[#4a6850]/20 rounded-full shadow-lg">
                      <Avatar name={user?.name || "User"} photoURL={user?.photoURL} size="xl" />
                    </div>
                    {/* Online Indicator */}
                    <div className="absolute -bottom-0.5 -right-0.5 w-6 h-6 bg-green-400 rounded-full border-[3px] border-white shadow-lg"></div>
                  </div>
                  {/* Camera Overlay */}
                  <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200">
                    {isUploadingPhoto ? (
                      <Loader2 className="w-6 h-6 text-white animate-spin" />
                    ) : (
                      <Camera className="w-6 h-6 text-white" />
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

                <div className="flex-1 min-w-0">
                  <h2 className="text-2xl lg:text-3xl font-black text-gray-900 tracking-tight mb-0.5 truncate">{user?.name}</h2>
                  {user?.username && (
                    <p className="text-[#4a6850] text-sm font-bold truncate">@{user.username}</p>
                  )}
                  <p className="text-gray-500 text-xs lg:text-sm flex items-center gap-2 mt-2 font-semibold truncate">
                    <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="truncate">{user?.email}</span>
                  </p>
                  {user?.phone && (
                    <p className="text-gray-500 text-xs lg:text-sm flex items-center gap-2 mt-1 font-semibold">
                      <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                      {user.phone}
                    </p>
                  )}
                </div>
              </div>

              {/* Stats Row */}
              <div className="grid grid-cols-3 gap-3 mt-6 pt-5 border-t border-[#4a6850]/10">
                <div className="text-center">
                  <p className="text-[#4a6850]/50 text-[10px] font-bold uppercase tracking-widest">{t('profile.member_since')}</p>
                  <p className="text-gray-900 font-black text-sm mt-1">{memberSince}</p>
                </div>
                <div className="text-center">
                  <p className="text-[#4a6850]/50 text-[10px] font-bold uppercase tracking-widest">{t('profile.verified')}</p>
                  <p className="text-[#4a6850] font-black text-sm mt-1 flex items-center justify-center gap-1">
                    <Check className="w-3.5 h-3.5" /> {t('profile.verified')}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-[#4a6850]/50 text-[10px] font-bold uppercase tracking-widest">{t('profile.payments_added')}</p>
                  <p className="text-gray-900 font-black text-sm mt-1">
                    {t('profile.added_plural', { count: hasPaymentDetails ? Object.keys(user?.paymentDetails || {}).length : 0 })}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="px-4 space-y-6">
          {/* Account Section - iPhone Grouped Style */}
          <div className="space-y-3">
            <h3 className="text-[12px] font-black text-[#4a6850]/70 uppercase tracking-[0.2em] px-5">{t('profile.account')}</h3>

            <div className="bg-white rounded-[2rem] shadow-[0_20px_60px_rgba(74,104,80,0.08)] border border-[#4a6850]/5 divide-y divide-[#4a6850]/5 overflow-hidden">
              {/* Edit Profile */}
              <button
                onClick={() => {
                  setEditName(user?.name || "");
                  setEditPhone(user?.phone || "");
                  setShowEditSheet(true);
                }}
                aria-label={t('profile.edit_profile')}
                className="w-full flex items-center justify-between p-5 active:bg-[#4a6850]/5 transition-colors group"
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-[#4a6850]/10 flex items-center justify-center shadow-sm">
                    <User className="w-5 h-5 text-[#4a6850]" />
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-[15px] font-black tracking-tight text-gray-900">{t('profile.edit_profile')}</p>
                    <p className="text-[12px] text-[#4a6850]/70 font-bold mt-0.5 truncate">{t('profile.update_profile_desc')}</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-[#4a6850]/30 flex-shrink-0 ml-3" />
              </button>

              {/* Payment Details */}
              <button
                onClick={() => {
                  setJazzCash(user?.paymentDetails?.jazzCash || "");
                  setEasypaisa(user?.paymentDetails?.easypaisa || "");
                  setBankName(user?.paymentDetails?.bankName || "");
                  setAccountNumber(user?.paymentDetails?.accountNumber || "");
                  setRaastId(user?.paymentDetails?.raastId || "");
                  setShowPaymentSheet(true);
                }}
                aria-label={t('profile.payment_details')}
                className="w-full flex items-center justify-between p-5 active:bg-[#4a6850]/5 transition-colors group"
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center shadow-sm">
                    <CreditCard className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center gap-2">
                      <p className="text-[15px] font-black tracking-tight text-gray-900">{t('profile.payment_methods')}</p>
                      {hasPaymentDetails && (
                        <div className="w-5 h-5 rounded-full bg-[#4a6850] flex items-center justify-center">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </div>
                    <p className="text-[12px] text-[#4a6850]/70 font-bold mt-0.5 truncate">
                      {hasPaymentDetails ? t('profile.methods_added_plural', { count: Object.keys(user?.paymentDetails || {}).length }) : t('profile.payment_methods_desc')}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-[#4a6850]/30 flex-shrink-0 ml-3" />
              </button>
            </div>
          </div>


          {/* Preferences Section - iPhone Grouped Style */}
          <div className="space-y-3">
            <h3 className="text-[12px] font-black text-[#4a6850]/70 uppercase tracking-[0.2em] px-5">{t('profile.preferences')}</h3>

            <div className="bg-white rounded-[2rem] shadow-[0_20px_60px_rgba(74,104,80,0.08)] border border-[#4a6850]/5 divide-y divide-[#4a6850]/5 overflow-hidden">
              <button
                onClick={() => navigate("/settings")}
                aria-label={t('profile.general_settings')}
                className="w-full flex items-center justify-between p-5 active:bg-[#4a6850]/5 transition-colors"
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-[#4a6850]/10 flex items-center justify-center shadow-sm">
                    <Settings className="w-5 h-5 text-[#4a6850]" />
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-[15px] font-black tracking-tight text-gray-900">{t('profile.general_settings')}</p>
                    <p className="text-[12px] text-[#4a6850]/70 font-bold mt-0.5 truncate">{t('profile.general_settings_desc')}</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-[#4a6850]/30 flex-shrink-0 ml-3" />
              </button>

              <button
                onClick={() => navigate("/security")}
                aria-label={t('profile.security')}
                className="w-full flex items-center justify-between p-5 active:bg-[#4a6850]/5 transition-colors"
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-orange-50 flex items-center justify-center shadow-sm">
                    <Shield className="w-5 h-5 text-orange-600" />
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-[15px] font-black tracking-tight text-gray-900">{t('profile.security')}</p>
                    <p className="text-[12px] text-[#4a6850]/70 font-bold mt-0.5 truncate">{t('profile.security_desc')}</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-[#4a6850]/30 flex-shrink-0 ml-3" />
              </button>
            </div>
          </div>

          {/* Support Section - iPhone Grouped Style */}
          <div className="space-y-3">
            <h3 className="text-[12px] font-black text-[#4a6850]/70 uppercase tracking-[0.2em] px-5">{t('profile.support')}</h3>

            <div className="bg-white rounded-[2rem] shadow-[0_20px_60px_rgba(74,104,80,0.08)] border border-[#4a6850]/5 divide-y divide-[#4a6850]/5 overflow-hidden">
              <button
                onClick={() => navigate("/about")}
                aria-label={t('profile.about')}
                className="w-full flex items-center justify-between p-5 active:bg-[#4a6850]/5 transition-colors"
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-[#4a6850]/10 flex items-center justify-center shadow-sm">
                    <Info className="w-5 h-5 text-[#4a6850]" />
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-[15px] font-black tracking-tight text-gray-900">{t('profile.about')}</p>
                    <p className="text-[12px] text-[#4a6850]/70 font-bold mt-0.5 truncate">{t('profile.about_desc')}</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-[#4a6850]/30 flex-shrink-0 ml-3" />
              </button>

              <a
                href="mailto:support@aarx.online"
                className="w-full flex items-center justify-between p-5 active:bg-[#4a6850]/5 transition-colors"
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-teal-50 flex items-center justify-center shadow-sm">
                    <HelpCircle className="w-5 h-5 text-teal-600" />
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-[15px] font-black tracking-tight text-gray-900">{t('profile.help_support')}</p>
                    <p className="text-[12px] text-[#4a6850]/70 font-bold mt-0.5 truncate">{t('profile.help_support_desc')}</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-[#4a6850]/30 flex-shrink-0 ml-3" />
              </a>

              <button
                onClick={async () => {
                  if (confirm('Clear app cache? This will refresh the app with the latest version.')) {
                    try {
                      if ('caches' in window) {
                        const cacheNames = await caches.keys();
                        await Promise.all(cacheNames.map(name => caches.delete(name)));
                      }
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
                aria-label={t('profile.clear_cache')}
                className="w-full flex items-center justify-between p-5 active:bg-[#4a6850]/5 transition-colors"
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-amber-50 flex items-center justify-center shadow-sm">
                    <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-[15px] font-black tracking-tight text-gray-900">{t('profile.clear_cache')}</p>
                    <p className="text-[12px] text-[#4a6850]/70 font-bold mt-0.5 truncate">{t('profile.clear_cache_desc')}</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-[#4a6850]/30 flex-shrink-0 ml-3" />
              </button>
            </div>
          </div>

          {/* Share */}
          <ShareButton
            variant="card"
            className="animate-slide-up"
          />

          {/* Logout */}
          <div className="bg-white rounded-[2rem] shadow-[0_20px_60px_rgba(74,104,80,0.08)] border border-red-100 overflow-hidden">
            <button
              aria-label={t('profile.logout')}
              onClick={handleLogoutClick}
              className="w-full flex items-center gap-4 p-5 active:bg-red-50 transition-colors"
            >
              <div className="w-10 h-10 rounded-2xl bg-red-50 flex items-center justify-center shadow-sm">
                <LogOut className="w-5 h-5 text-red-500" />
              </div>
              <p className="text-[15px] font-black tracking-tight text-red-500">{t('profile.logout')}</p>
            </button>
          </div>


          {/* App Version */}
          <div className="text-center py-4">
            <p className="text-xs text-gray-400 mb-1">Hostel Ledger v{__APP_VERSION__}</p>
            <p className="text-xs text-gray-500 mb-3">Build {__BUILD_DATE__}</p>
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
          <SheetContent side="bottom" className="h-auto rounded-t-3xl flex flex-col bg-white border-t border-[#4a6850]/10 z-[100]">
            <SheetHeader className="flex-shrink-0 mb-6 pt-2">
              {/* Handle Bar */}
              <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-4"></div>
              <SheetTitle className="text-center text-2xl font-black text-gray-900 tracking-tight">{t('profile.edit_profile')}</SheetTitle>
              <SheetDescription className="text-center text-sm text-[#4a6850]/80 font-bold">
                {t('profile.update_profile_desc')}
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-4 pb-4">
              {/* Personal Info Card */}
              <div className="bg-white rounded-3xl border border-[#4a6850]/10 shadow-[0_20px_60px_rgba(74,104,80,0.08)] p-5 space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-black text-[#4a6850]/80 uppercase tracking-wide ml-1">{t('profile.account')}</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#4a6850]/60" />
                    <Input
                      type="text"
                      placeholder={t('common.loading')}
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="h-14 pl-12 rounded-2xl bg-gray-50 border-[#4a6850]/10 font-bold text-gray-900 focus:border-[#4a6850] focus:ring-[#4a6850]/20"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-[#4a6850]/80 uppercase tracking-wide ml-1">{t('personal_space.phone')}</label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#4a6850]/60" />
                    <Input
                      type="tel"
                      placeholder="03XX-XXXXXXX"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      className="h-14 pl-12 rounded-2xl bg-gray-50 border-[#4a6850]/10 font-bold text-gray-900 focus:border-[#4a6850] focus:ring-[#4a6850]/20"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex-shrink-0 pt-4 border-t border-[#4a6850]/10">
              <Button
                onClick={handleSaveProfile}
                className="w-full h-14 rounded-3xl bg-gradient-to-r from-[#4a6850] to-[#3d5643] text-white font-black text-base shadow-[0_8px_32px_rgba(74,104,80,0.3)] hover:shadow-[0_12px_40px_rgba(74,104,80,0.4)] hover:from-[#3d5643] hover:to-[#2f4336] transition-all"
              >
                {t('profile.save_changes')}
              </Button>
            </div>
          </SheetContent>
        </Sheet>

        {/* Payment Details Sheet */}
        <Sheet open={showPaymentSheet} onOpenChange={setShowPaymentSheet}>
          <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl flex flex-col bg-white border-t border-[#4a6850]/10 z-[100]">
            <SheetHeader className="flex-shrink-0 mb-6 pt-2">
              {/* Handle Bar */}
              <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-4"></div>
              <SheetTitle className="text-center text-2xl font-black text-gray-900 tracking-tight">{t('sheets.payment_details.title')}</SheetTitle>
              <SheetDescription className="text-center text-sm text-[#4a6850]/80 font-bold">
                {t('sheets.payment_details.subtitle')}
              </SheetDescription>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto space-y-4 pb-4">
              <div className="flex items-center gap-2 justify-center mb-2">
                <p className="text-xs text-[#4a6850]/60 text-center font-bold">
                  {t('sheets.payment_details.visibility_notice')}
                </p>
                <Tooltip
                  content={t('sheets.payment_details.visibility_tooltip')}
                  position="top"
                />
              </div>

              {/* Mobile Wallets Card */}
              <div className="bg-white rounded-3xl border border-[#4a6850]/10 shadow-[0_20px_60px_rgba(74,104,80,0.08)] p-5 space-y-4">
                <h3 className="text-sm font-black text-gray-900 tracking-tight flex items-center gap-2">
                  <div className="w-8 h-8 rounded-2xl bg-gradient-to-br from-[#4a6850]/20 to-[#3d5643]/20 flex items-center justify-center">
                    <Phone className="w-4 h-4 text-[#4a6850]" />
                  </div>
                  {t('sheets.payment_details.mobile_wallets')}
                </h3>

                <div className="space-y-2">
                  <label className="text-xs font-black text-[#4a6850]/80 uppercase tracking-wide ml-1">{t('sheets.payment_details.jazzcash_label')}</label>
                  <Input
                    type="tel"
                    placeholder="03XX-XXXXXXX"
                    value={jazzCash}
                    onChange={(e) => setJazzCash(e.target.value)}
                    className="h-14 rounded-2xl bg-gray-50 border-[#4a6850]/10 font-bold text-gray-900 focus:border-[#4a6850] focus:ring-[#4a6850]/20"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-[#4a6850]/80 uppercase tracking-wide ml-1">{t('sheets.payment_details.easypaisa_label')}</label>
                  <Input
                    type="tel"
                    placeholder="03XX-XXXXXXX"
                    value={easypaisa}
                    onChange={(e) => setEasypaisa(e.target.value)}
                    className="h-14 rounded-2xl bg-gray-50 border-[#4a6850]/10 font-bold text-gray-900 focus:border-[#4a6850] focus:ring-[#4a6850]/20"
                  />
                </div>
              </div>

              {/* Bank Account Card */}
              <div className="bg-white rounded-3xl border border-[#4a6850]/10 shadow-[0_20px_60px_rgba(74,104,80,0.08)] p-5 space-y-4">
                <h3 className="text-sm font-black text-gray-900 tracking-tight flex items-center gap-2">
                  <div className="w-8 h-8 rounded-2xl bg-gradient-to-br from-[#4a6850]/20 to-[#3d5643]/20 flex items-center justify-center">
                    <Building2 className="w-4 h-4 text-[#4a6850]" />
                  </div>
                  {t('sheets.payment_details.bank_account')}
                </h3>

                <div className="space-y-2">
                  <label className="text-xs font-black text-[#4a6850]/80 uppercase tracking-wide ml-1">{t('sheets.payment_details.bank_name_label')}</label>
                  <Select value={bankName} onValueChange={setBankName}>
                    <SelectTrigger className="h-14 rounded-2xl bg-gray-50 border-[#4a6850]/10 font-bold text-gray-900">
                      <SelectValue placeholder={t('sheets.payment_details.bank_placeholder')} />
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
                  <label className="text-xs font-black text-[#4a6850]/80 uppercase tracking-wide ml-1">{t('sheets.payment_details.account_iban_label')}</label>
                  <div className="relative">
                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#4a6850]/60" />
                    <Input
                      type="text"
                      placeholder={t('sheets.payment_details.account_placeholder')}
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      className="h-14 pl-12 rounded-2xl bg-gray-50 border-[#4a6850]/10 font-bold text-gray-900 focus:border-[#4a6850] focus:ring-[#4a6850]/20"
                    />
                  </div>
                </div>
              </div>

              {/* Raast Card */}
              <div className="bg-white rounded-3xl border border-[#4a6850]/10 shadow-[0_20px_60px_rgba(74,104,80,0.08)] p-5 space-y-4">
                <h3 className="text-sm font-black text-gray-900 tracking-tight flex items-center gap-2">
                  <div className="w-8 h-8 rounded-2xl bg-gradient-to-br from-[#4a6850]/20 to-[#3d5643]/20 flex items-center justify-center">
                    <CreditCard className="w-4 h-4 text-[#4a6850]" />
                  </div>
                  {t('sheets.payment_details.raast')}
                </h3>

                <div className="space-y-2">
                  <label className="text-xs font-black text-[#4a6850]/80 uppercase tracking-wide ml-1">{t('sheets.payment_details.raast_id_label')}</label>
                  <Input
                    type="text"
                    placeholder={t('sheets.payment_details.raast_placeholder')}
                    value={raastId}
                    onChange={(e) => setRaastId(e.target.value)}
                    className="h-14 rounded-2xl bg-gray-50 border-[#4a6850]/10 font-bold text-gray-900 focus:border-[#4a6850] focus:ring-[#4a6850]/20"
                  />
                </div>
              </div>
            </div>

            <div className="flex-shrink-0 pt-4 border-t border-[#4a6850]/10">
              <Button
                onClick={handleSavePaymentDetails}
                className="w-full h-14 rounded-3xl bg-gradient-to-r from-[#4a6850] to-[#3d5643] text-white font-black text-base shadow-[0_8px_32px_rgba(74,104,80,0.3)] hover:shadow-[0_12px_40px_rgba(74,104,80,0.4)] hover:from-[#3d5643] hover:to-[#2f4336] transition-all"
              >
                {t('sheets.payment_details.save_btn')}
              </Button>
            </div>
          </SheetContent>
        </Sheet>

        {/* Photo Options Sheet */}
        <Sheet open={showPhotoOptionsSheet} onOpenChange={setShowPhotoOptionsSheet}>
          <SheetContent side="bottom" className="h-auto rounded-t-3xl bg-white border-t border-[#4a6850]/10 z-[100]">
            <SheetHeader className="mb-6 pt-2">
              {/* Handle Bar */}
              <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-4"></div>
              <SheetTitle className="text-center text-2xl font-black text-gray-900 tracking-tight">{t('profile.choose_option')}</SheetTitle>
              <SheetDescription className="text-center text-sm text-[#4a6850]/80 font-bold">
                {t('profile.choose_option')}
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-3 pb-4">
              <Button
                onClick={handleChangePhoto}
                className="w-full h-14 rounded-3xl bg-gradient-to-r from-[#4a6850] to-[#3d5643] text-white font-black text-base shadow-[0_8px_32px_rgba(74,104,80,0.3)] hover:shadow-[0_12px_40px_rgba(74,104,80,0.4)] hover:from-[#3d5643] hover:to-[#2f4336] transition-all flex items-center justify-center gap-3"
              >
                <Camera className="w-5 h-5" />
                {user?.photoURL ? t('profile.change_picture') : t('profile.upload_picture')}
              </Button>

              {user?.photoURL && (
                <Button
                  onClick={handleRemovePhoto}
                  variant="outline"
                  className="w-full h-14 rounded-3xl border-2 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 font-black text-base flex items-center justify-center gap-3 transition-all"
                >
                  <X className="w-5 h-5" />
                  {t('profile.remove_picture')}
                </Button>
              )}

              <Button
                onClick={() => setShowPhotoOptionsSheet(false)}
                variant="secondary"
                className="w-full h-14 rounded-3xl font-black text-base"
              >
                {t('common.cancel')}
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </AppContainer >
    </>
  );
};

export default Profile;
