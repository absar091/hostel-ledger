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
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-green-50 pb-20">
      {/* Header */}
      <header className="px-4 pt-8 pb-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
          <PWAInstallButton />
        </div>

        {/* Profile Card - Simple white card */}
        <div className="bg-white rounded-3xl p-6 shadow-lg animate-fade-in border border-gray-100">
          <div className="flex items-start gap-4 mb-4">
            {/* Avatar - Clickable */}
            <button
              onClick={handlePhotoClick}
              disabled={isUploadingPhoto}
              className="relative group cursor-pointer"
            >
              <Avatar name={user?.name || "User"} photoURL={user?.photoURL} size="xl" />
              
              {/* Camera Icon Overlay - Shows on Hover */}
              <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
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

            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900">{user?.name}</h2>
              <p className="text-gray-600 text-sm flex items-center gap-1 mt-1">
                <Mail className="w-3 h-3" />
                {user?.email}
              </p>
              {user?.phone && (
                <p className="text-gray-600 text-sm flex items-center gap-1 mt-1">
                  <Phone className="w-3 h-3" />
                  {user.phone}
                </p>
              )}
              <p className="text-gray-500 text-xs flex items-center gap-1 mt-2">
                <Calendar className="w-3 h-3" />
                Member since {memberSince}
              </p>
            </div>
          </div>
          
          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-gray-100">
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-gray-500 text-xs">Email Status</p>
              <p className="font-semibold text-sm flex items-center gap-1 mt-1 text-emerald-600">
                <Check className="w-4 h-4" />
                Verified
              </p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-gray-500 text-xs">Payment Methods</p>
              <p className="font-semibold text-sm mt-1 text-gray-900">
                {hasPaymentDetails ? Object.keys(user?.paymentDetails || {}).length : 0} Added
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="px-4 space-y-6">
        {/* Account Section */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide px-2">Account</h3>
          
          <button
            onClick={() => {
              setEditName(user?.name || "");
              setEditPhone(user?.phone || "");
              setShowEditSheet(true);
            }}
            className="w-full bg-white rounded-2xl p-4 flex items-center gap-4 shadow-sm border border-gray-200 hover:shadow-md transition-all animate-slide-up"
            style={{ animationDelay: "0.05s" }}
          >
            <div className="w-11 h-11 rounded-xl bg-emerald-100 flex items-center justify-center">
              <User className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-semibold text-gray-900">Edit Profile</p>
              <p className="text-sm text-gray-500">Update your name and phone</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
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
            className="w-full bg-white rounded-2xl p-4 flex items-center gap-4 shadow-sm border border-gray-200 hover:shadow-md transition-all animate-slide-up"
            style={{ animationDelay: "0.1s" }}
          >
            <div className="w-11 h-11 rounded-xl bg-blue-100 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1 text-left">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-gray-900">Payment Details</p>
                {hasPaymentDetails && (
                  <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
              </div>
              <p className="text-sm text-gray-500">
                {hasPaymentDetails ? `${Object.keys(user?.paymentDetails || {}).length} methods added` : "Add payment methods"}
              </p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Preferences Section */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide px-2">Preferences</h3>
          
          <button
            onClick={() => toast.info("Notification settings coming soon!")}
            className="w-full bg-white rounded-2xl p-4 flex items-center gap-4 shadow-sm border border-gray-200 hover:shadow-md transition-all animate-slide-up"
            style={{ animationDelay: "0.15s" }}
          >
            <div className="w-11 h-11 rounded-xl bg-purple-100 flex items-center justify-center">
              <Bell className="w-5 h-5 text-purple-600" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-semibold text-gray-900">Notifications</p>
              <p className="text-sm text-gray-500">Manage email and push notifications</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>

          <button
            onClick={() => toast.info("Security settings coming soon!")}
            className="w-full bg-white rounded-2xl p-4 flex items-center gap-4 shadow-sm border border-gray-200 hover:shadow-md transition-all animate-slide-up"
            style={{ animationDelay: "0.2s" }}
          >
            <div className="w-11 h-11 rounded-xl bg-orange-100 flex items-center justify-center">
              <Shield className="w-5 h-5 text-orange-600" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-semibold text-gray-900">Security & Privacy</p>
              <p className="text-sm text-gray-500">Password, data export, delete account</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Support Section */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide px-2">Support</h3>
          
          <button
            onClick={() => navigate("/about")}
            className="w-full bg-white rounded-2xl p-4 flex items-center gap-4 shadow-sm border border-gray-200 hover:shadow-md transition-all animate-slide-up"
            style={{ animationDelay: "0.25s" }}
          >
            <div className="w-11 h-11 rounded-xl bg-gray-100 flex items-center justify-center">
              <Info className="w-5 h-5 text-gray-600" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-semibold text-gray-900">About</p>
              <p className="text-sm text-gray-500">Version, terms, privacy policy</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>

          <a
            href="mailto:support@aarx.online"
            className="w-full bg-white rounded-2xl p-4 flex items-center gap-4 shadow-sm border border-gray-200 hover:shadow-md transition-all animate-slide-up"
            style={{ animationDelay: "0.3s" }}
          >
            <div className="w-11 h-11 rounded-xl bg-teal-100 flex items-center justify-center">
              <HelpCircle className="w-5 h-5 text-teal-600" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-semibold text-gray-900">Help & Support</p>
              <p className="text-sm text-gray-500">Contact us for assistance</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </a>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogoutClick}
          className="w-full bg-white rounded-2xl p-4 flex items-center gap-4 animate-slide-up border border-red-200 hover:shadow-md hover:border-red-300 transition-all"
          style={{ animationDelay: "0.35s" }}
        >
          <div className="w-11 h-11 rounded-xl bg-red-100 flex items-center justify-center">
            <LogOut className="w-5 h-5 text-red-600" />
          </div>
          <p className="font-semibold text-red-600">Log Out</p>
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
