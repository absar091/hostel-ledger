import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFirebaseAuth, PaymentDetails } from "@/contexts/FirebaseAuthContext";
import { toast } from "sonner";
import { ArrowLeft, User, Phone, CreditCard, Building2, LogOut, Check, ChevronRight } from "lucide-react";
import Avatar from "@/components/Avatar";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
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
  const { user, updateUserProfile, logout } = useFirebaseAuth();
  const [showEditSheet, setShowEditSheet] = useState(false);
  const [showPaymentSheet, setShowPaymentSheet] = useState(false);
  
  // Edit form state
  const [editName, setEditName] = useState(user?.name || "");
  const [editPhone, setEditPhone] = useState(user?.phone || "");
  
  // Payment details state
  const [jazzCash, setJazzCash] = useState(user?.paymentDetails?.jazzCash || "");
  const [easypaisa, setEasypaisa] = useState(user?.paymentDetails?.easypaisa || "");
  const [bankName, setBankName] = useState(user?.paymentDetails?.bankName || "");
  const [accountNumber, setAccountNumber] = useState(user?.paymentDetails?.accountNumber || "");
  const [raastId, setRaastId] = useState(user?.paymentDetails?.raastId || "");

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

  const hasPaymentDetails = user?.paymentDetails && Object.keys(user.paymentDetails).length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-green-50 pb-8">
      {/* Header */}
      <header className="px-4 pt-8 pb-6">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate("/")}
            className="w-10 h-10 rounded-full bg-white shadow-sm border border-gray-100 flex items-center justify-center hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">Profile</h1>
        </div>

        {/* Profile Card */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-white/50 animate-fade-in">
          <div className="flex items-center gap-4">
            <Avatar name={user?.name || "User"} size="lg" />
            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-900">{user?.name}</h2>
              <p className="text-gray-500 text-sm">{user?.email}</p>
              {user?.phone && (
                <p className="text-gray-500 text-sm">{user.phone}</p>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="px-4 space-y-4">
        {/* Edit Profile */}
        <button
          onClick={() => {
            setEditName(user?.name || "");
            setEditPhone(user?.phone || "");
            setShowEditSheet(true);
          }}
          className="w-full bg-white/80 backdrop-blur-sm rounded-xl p-4 flex items-center gap-4 shadow-sm border border-white/50 animate-slide-up"
          style={{ animationDelay: "0.05s" }}
        >
          <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
            <User className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="flex-1 text-left">
            <p className="font-medium text-gray-900">Edit Profile</p>
            <p className="text-sm text-gray-500">Update your name and phone</p>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400" />
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
          className="w-full bg-white/80 backdrop-blur-sm rounded-xl p-4 flex items-center gap-4 shadow-sm border border-white/50 animate-slide-up"
          style={{ animationDelay: "0.1s" }}
        >
          <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
            <CreditCard className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="flex-1 text-left">
            <div className="flex items-center gap-2">
              <p className="font-medium text-gray-900">Payment Details</p>
              <Tooltip 
                content="Add your payment methods so group members know how to send you money when settling expenses."
                position="top"
              />
            </div>
            <p className="text-sm text-gray-500">
              {hasPaymentDetails ? "Manage your payment methods" : "Add JazzCash, Easypaisa, Bank details"}
            </p>
          </div>
          {hasPaymentDetails && (
            <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
              <Check className="w-4 h-4 text-white" />
            </div>
          )}
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </button>

        {/* Current Payment Details Preview */}
        {hasPaymentDetails && (
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 space-y-3 animate-fade-in border border-white/50">
            <p className="text-sm font-medium text-gray-500">Your Payment Methods</p>
            <div className="grid grid-cols-2 gap-3">
              {user?.paymentDetails?.jazzCash && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">JazzCash</p>
                  <p className="font-medium text-sm text-gray-900">{user.paymentDetails.jazzCash}</p>
                </div>
              )}
              {user?.paymentDetails?.easypaisa && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Easypaisa</p>
                  <p className="font-medium text-sm text-gray-900">{user.paymentDetails.easypaisa}</p>
                </div>
              )}
              {user?.paymentDetails?.bankName && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">{user.paymentDetails.bankName}</p>
                  <p className="font-medium text-sm text-gray-900">{user.paymentDetails.accountNumber}</p>
                </div>
              )}
              {user?.paymentDetails?.raastId && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Raast ID</p>
                  <p className="font-medium text-sm text-gray-900">{user.paymentDetails.raastId}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full bg-red-50 rounded-xl p-4 flex items-center gap-4 animate-slide-up border border-red-100"
          style={{ animationDelay: "0.15s" }}
        >
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
            <LogOut className="w-5 h-5 text-red-500" />
          </div>
          <p className="font-medium text-red-500">Log Out</p>
        </button>
      </main>

      {/* Edit Profile Sheet */}
      <Sheet open={showEditSheet} onOpenChange={setShowEditSheet}>
        <SheetContent side="bottom" className="h-auto rounded-t-3xl flex flex-col">
          <SheetHeader className="flex-shrink-0 mb-4">
            <SheetTitle className="text-center">Edit Profile</SheetTitle>
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
    </div>
  );
};

export default Profile;
