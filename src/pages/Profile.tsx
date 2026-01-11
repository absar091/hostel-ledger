import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth, PaymentDetails } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { ArrowLeft, User, Mail, Phone, CreditCard, Building2, LogOut, Check, ChevronRight, PiggyBank } from "lucide-react";
import Avatar from "@/components/Avatar";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
  const { user, updateProfile, logout } = useAuth();
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

  const handleSaveProfile = () => {
    updateProfile({ name: editName, phone: editPhone || undefined });
    toast.success("Profile updated");
    setShowEditSheet(false);
  };

  const handleSavePaymentDetails = () => {
    const paymentDetails: PaymentDetails = {};
    if (jazzCash) paymentDetails.jazzCash = jazzCash;
    if (easypaisa) paymentDetails.easypaisa = easypaisa;
    if (bankName) paymentDetails.bankName = bankName;
    if (accountNumber) paymentDetails.accountNumber = accountNumber;
    if (raastId) paymentDetails.raastId = raastId;
    
    updateProfile({ paymentDetails });
    toast.success("Payment details updated");
    setShowPaymentSheet(false);
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
    toast.success("Logged out successfully");
  };

  const hasPaymentDetails = user?.paymentDetails && Object.keys(user.paymentDetails).length > 0;

  return (
    <div className="min-h-screen bg-background pb-8">
      {/* Header */}
      <header className="px-4 pt-8 pb-6">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate("/")}
            className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold text-foreground">Profile</h1>
        </div>

        {/* Profile Card */}
        <div className="bg-card rounded-2xl p-6 shadow-md animate-fade-in">
          <div className="flex items-center gap-4">
            <Avatar name={user?.name || "User"} size="lg" />
            <div className="flex-1">
              <h2 className="text-xl font-bold text-foreground">{user?.name}</h2>
              <p className="text-muted-foreground text-sm">{user?.email}</p>
              {user?.phone && (
                <p className="text-muted-foreground text-sm">{user.phone}</p>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="px-4 space-y-4">
        {/* My Budget */}
        <button
          onClick={() => navigate("/budget")}
          className="w-full bg-gradient-to-r from-primary to-primary/80 rounded-xl p-4 flex items-center gap-4 shadow-md animate-slide-up text-primary-foreground"
        >
          <div className="w-10 h-10 rounded-full bg-primary-foreground/20 flex items-center justify-center">
            <PiggyBank className="w-5 h-5 text-primary-foreground" />
          </div>
          <div className="flex-1 text-left">
            <p className="font-medium">My Budget</p>
            <p className="text-sm opacity-80">Track your monthly funds & spending</p>
          </div>
          <ChevronRight className="w-5 h-5 opacity-80" />
        </button>

        {/* Edit Profile */}
        <button
          onClick={() => {
            setEditName(user?.name || "");
            setEditPhone(user?.phone || "");
            setShowEditSheet(true);
          }}
          className="w-full bg-card rounded-xl p-4 flex items-center gap-4 shadow-sm animate-slide-up"
          style={{ animationDelay: "0.05s" }}
        >
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 text-left">
            <p className="font-medium text-foreground">Edit Profile</p>
            <p className="text-sm text-muted-foreground">Update your name and phone</p>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
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
          className="w-full bg-card rounded-xl p-4 flex items-center gap-4 shadow-sm animate-slide-up"
          style={{ animationDelay: "0.1s" }}
        >
          <div className="w-10 h-10 rounded-full bg-positive/10 flex items-center justify-center">
            <CreditCard className="w-5 h-5 text-positive" />
          </div>
          <div className="flex-1 text-left">
            <p className="font-medium text-foreground">Payment Details</p>
            <p className="text-sm text-muted-foreground">
              {hasPaymentDetails ? "Manage your payment methods" : "Add JazzCash, Easypaisa, Bank details"}
            </p>
          </div>
          {hasPaymentDetails && (
            <div className="w-6 h-6 rounded-full bg-positive flex items-center justify-center">
              <Check className="w-4 h-4 text-primary-foreground" />
            </div>
          )}
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </button>

        {/* Current Payment Details Preview */}
        {hasPaymentDetails && (
          <div className="bg-card rounded-xl p-4 space-y-3 animate-fade-in">
            <p className="text-sm font-medium text-muted-foreground">Your Payment Methods</p>
            <div className="grid grid-cols-2 gap-3">
              {user?.paymentDetails?.jazzCash && (
                <div className="bg-secondary rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">JazzCash</p>
                  <p className="font-medium text-sm">{user.paymentDetails.jazzCash}</p>
                </div>
              )}
              {user?.paymentDetails?.easypaisa && (
                <div className="bg-secondary rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">Easypaisa</p>
                  <p className="font-medium text-sm">{user.paymentDetails.easypaisa}</p>
                </div>
              )}
              {user?.paymentDetails?.bankName && (
                <div className="bg-secondary rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">{user.paymentDetails.bankName}</p>
                  <p className="font-medium text-sm">{user.paymentDetails.accountNumber}</p>
                </div>
              )}
              {user?.paymentDetails?.raastId && (
                <div className="bg-secondary rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">Raast ID</p>
                  <p className="font-medium text-sm">{user.paymentDetails.raastId}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full bg-destructive/10 rounded-xl p-4 flex items-center gap-4 animate-slide-up"
          style={{ animationDelay: "0.15s" }}
        >
          <div className="w-10 h-10 rounded-full bg-destructive/20 flex items-center justify-center">
            <LogOut className="w-5 h-5 text-destructive" />
          </div>
          <p className="font-medium text-destructive">Log Out</p>
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
            <p className="text-sm text-muted-foreground text-center">
              Add your payment details so group members can easily send you money
            </p>

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
