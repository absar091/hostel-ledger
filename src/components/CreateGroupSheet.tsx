import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Plus, Users, ChevronDown, ChevronUp, Phone, CreditCard, ChevronRight, Image as ImageIcon } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Avatar from "./Avatar";
import { cn } from "@/lib/utils";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { toast } from "sonner";
import { useFirebaseAuth } from "@/contexts/FirebaseAuthContext";

const EMOJI_OPTIONS = [
  "🏠", "🍽️", "✈️", "🎉", "🛒", "☕", "🎬", "🏋️",
  "🎮", "📚", "🚗", "🏖️", "🎂", "💼", "🎸", "⚽"
];

const BANKS = [
  "Allied Bank", "Askari Bank", "Bank Alfalah", "Bank Al Habib",
  "Faysal Bank", "Habib Bank Limited (HBL)", "JS Bank", "MCB Bank",
  "Meezan Bank", "National Bank of Pakistan", "Standard Chartered",
  "UBL", "Other"
];

interface MemberData {
  name: string;
  phone?: string;
  paymentDetails?: {
    jazzCash?: string;
    easypaisa?: string;
    bankName?: string;
    accountNumber?: string;
    raastId?: string;
  };
}

interface CreateGroupSheetProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    emoji: string;
    members: MemberData[];
    coverPhoto?: string;
  }) => void;
}

const CreateGroupSheet = ({ open, onClose, onSubmit }: CreateGroupSheetProps) => {
  console.log("🚀 3-STEP CreateGroupSheet loaded!");

  const [currentStep, setCurrentStep] = useState(1);
  const [groupName, setGroupName] = useState("");
  const [groupEmoji, setGroupEmoji] = useState("🏠");
  const [coverPhoto, setCoverPhoto] = useState<string>("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [groupMembers, setGroupMembers] = useState<MemberData[]>([]);

  const [memberName, setMemberName] = useState("");
  const [memberPhone, setMemberPhone] = useState("");
  const [showPaymentFields, setShowPaymentFields] = useState(false);
  const [jazzCash, setJazzCash] = useState("");
  const [easypaisa, setEasypaisa] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [raastId, setRaastId] = useState("");

  const { checkUsernameAvailable } = useFirebaseAuth(); // Access username check
  const [invitedUsernames, setInvitedUsernames] = useState<string[]>([]);
  const [inviteInput, setInviteInput] = useState("");
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);

  useEffect(() => {
    console.log(`📍 Current Step: ${currentStep}`);
  }, [currentStep]);

  const resetForm = () => {
    setCurrentStep(1);
    setGroupName("");
    setGroupEmoji("🏠");
    setCoverPhoto("");
    setGroupMembers([]);
    setInvitedUsernames([]);
    setMemberName("");
    setMemberPhone("");
    setShowPaymentFields(false);
    setJazzCash("");
    setEasypaisa("");
    setBankName("");
    setAccountNumber("");
    setRaastId("");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleCoverPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    // ... existing logic ...
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image too large", { description: "Please select an image under 5MB" });
      return;
    }

    setUploadingPhoto(true);
    try {
      const result = await uploadToCloudinary(file);
      if (result.success && result.url) {
        setCoverPhoto(result.url);
        toast.success("Cover photo uploaded!");
      } else {
        toast.error("Upload failed", { description: result.error || "Please try again" });
      }
    } catch (error) {
      toast.error("Upload failed", { description: "Please try again" });
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleAddMember = () => {
    if (memberName.trim() && !groupMembers.some(m => m.name === memberName.trim())) {
      const paymentDetails: MemberData["paymentDetails"] = {};
      if (jazzCash) paymentDetails.jazzCash = jazzCash;
      if (easypaisa) paymentDetails.easypaisa = easypaisa;
      if (bankName) paymentDetails.bankName = bankName;
      if (accountNumber) paymentDetails.accountNumber = accountNumber;
      if (raastId) paymentDetails.raastId = raastId;

      const newMember: MemberData = {
        name: memberName.trim(),
        phone: memberPhone || undefined,
        paymentDetails: Object.keys(paymentDetails).length > 0 ? paymentDetails : undefined,
      };

      setGroupMembers([...groupMembers, newMember]);
      setMemberName("");
      setMemberPhone("");
      setShowPaymentFields(false);
      setJazzCash("");
      setEasypaisa("");
      setBankName("");
      setAccountNumber("");
      setRaastId("");
    }
  };



  // New State for Email Invites
  const [invitedEmails, setInvitedEmails] = useState<string[]>([]);
  const [showEmailInvite, setShowEmailInvite] = useState(false);
  const [emailInput, setEmailInput] = useState("");

  const handleAddEmailInvite = () => {
    if (!emailInput) return;
    // Basic validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput)) {
      toast.error("Invalid email address");
      return;
    }
    if (invitedEmails.includes(emailInput)) {
      toast.error("Email already added");
      return;
    }
    setInvitedEmails([...invitedEmails, emailInput]);
    setEmailInput("");
    setShowEmailInvite(false);
    setInviteInput(""); // Clear the username input that failed
    toast.success("Email invite added!");
  };

  const handleAddInvite = async () => {
    if (!inviteInput.trim()) return;

    // Check if already added
    if (invitedUsernames.includes(inviteInput.trim().toLowerCase())) {
      toast.error("User already added to invite list");
      return;
    }

    setIsCheckingUsername(true);
    setShowEmailInvite(false); // Reset
    try {
      const available = await checkUsernameAvailable(inviteInput.trim());

      if (available) {
        // Username NOT found (available means it doesn't exist)
        toast.error("Username not found", {
          description: "User does not exist on Hostel Ledger",
          action: {
            label: "Invite via Email?",
            onClick: () => setShowEmailInvite(true)
          }
        });
        // Also simpler: just show the UI
        setShowEmailInvite(true);
      } else {
        setInvitedUsernames([...invitedUsernames, inviteInput.trim().toLowerCase()]);
        setInviteInput("");
        toast.success("User found and added!");
      }
    } catch (e) {
      console.error("Check error", e);
      toast.error("Error checking username");
    } finally {
      setIsCheckingUsername(false);
    }
  };

  const handleRemoveEmailInvite = (email: string) => {
    setInvitedEmails(invitedEmails.filter(e => e !== email));
  };

  const handleRemoveInvite = (username: string) => {
    setInvitedUsernames(invitedUsernames.filter(u => u !== username));
  };

  const handleRemoveMember = (memberName: string) => {
    setGroupMembers(groupMembers.filter(m => m.name !== memberName));
  };

  // Update handleSubmit to include invitedEmails
  const handleSubmit = () => {
    const groupData: any = {
      name: groupName,
      emoji: groupEmoji,
      members: groupMembers,
      invitedUsernames: invitedUsernames,
      invitedEmails: invitedEmails // Pass invited emails
    };

    // Only add coverPhoto if it exists (Firebase doesn't allow undefined)
    if (coverPhoto) {
      groupData.coverPhoto = coverPhoto;
    }

    onSubmit(groupData);
    handleClose();
  };

  const canProceedToStep2 = groupName.trim().length > 0;
  const hasPaymentInfo = jazzCash || easypaisa || bankName || raastId;

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl flex flex-col bg-white border-t border-[#4a6850]/10 z-[100]">
        <SheetHeader className="flex-shrink-0 mb-4 pt-2">
          <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-4"></div>

          <SheetTitle className="text-center text-2xl font-black text-gray-900">
            {currentStep === 1 && "Start a Group"}
            {currentStep === 2 && "Invite Friends"}
            {currentStep === 3 && "Review"}
          </SheetTitle>
          <SheetDescription className="text-center text-sm text-[#4a6850]/80 font-bold">
            {currentStep === 1 && "Give your group a name and icon"}
            {currentStep === 2 && "Search usernames to add members"}
            {currentStep === 3 && "Ready to go?"}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto pb-4 px-1">
          {currentStep === 1 && (
            <div className="space-y-4 animate-fade-in">
              {/* Cover Photo - Simplified for cleaner step 1 */}
              <div>
                <div className="text-center mb-4">
                  <div className="w-24 h-24 mx-auto bg-gradient-to-br from-[#4a6850]/5 to-[#3d5643]/5 rounded-3xl flex items-center justify-center border-2 border-dashed border-[#4a6850]/20 relative overflow-hidden group hover:border-[#4a6850]/40 transition-all cursor-pointer" onClick={() => (document.querySelector('input[type="file"]') as HTMLInputElement)?.click()}>
                    {coverPhoto ? (
                      <img src={coverPhoto} alt="Cover" className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center">
                        <ImageIcon className="w-8 h-8 text-[#4a6850]/40 mb-1" />
                        <span className="text-[10px] font-bold text-[#4a6850]/60 uppercase">Add Photo</span>
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleCoverPhotoUpload}
                      disabled={uploadingPhoto}
                      className="hidden"
                    />
                    {coverPhoto && <div className="absolute inset-0 bg-black/20 hidden group-hover:flex items-center justify-center text-white font-bold text-xs">Change</div>}
                  </div>
                </div>

                <label className="text-xs font-black text-[#4a6850]/80 mb-2 block uppercase mx-1">
                  Group Name
                </label>
                <Input
                  placeholder="e.g., Apartment 3B, Summer Trip"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="h-14 rounded-2xl border-[#4a6850]/20 shadow-sm font-black text-lg text-center"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-xs font-black text-[#4a6850]/80 mb-2 block uppercase mx-1">
                  Group Icon
                </label>
                <div className="grid grid-cols-8 gap-2">
                  {EMOJI_OPTIONS.map((e) => (
                    <button
                      key={e}
                      onClick={() => setGroupEmoji(e)}
                      className={cn(
                        "aspect-square rounded-xl flex items-center justify-center text-2xl transition-all shadow-sm",
                        groupEmoji === e
                          ? "bg-gradient-to-br from-[#4a6850] to-[#3d5643] text-white scale-110 shadow-lg ring-2 ring-[#4a6850]/20"
                          : "bg-white hover:bg-[#4a6850]/5 border border-[#4a6850]/10"
                      )}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-6 animate-fade-in">
              {/* PRIMARY ACTION: INVITE BY USERNAME */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50/50 rounded-2xl p-4 border border-blue-100 shadow-sm">
                <h4 className="text-sm font-black text-blue-900 mb-3 uppercase flex items-center gap-2">
                  <Users className="w-4 h-4" /> Add by Username
                </h4>

                <div className="flex gap-2 mb-2">
                  <div className="relative flex-1">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-900/40 font-bold text-lg">@</span>
                    <Input
                      placeholder="username"
                      value={inviteInput}
                      onChange={(e) => setInviteInput(e.target.value.toLowerCase().replace(/[^a-z0-9._]/g, ""))}
                      className="h-12 pl-10 rounded-xl bg-white border-blue-200 focus:border-blue-400 font-bold text-base"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddInvite();
                        }
                      }}
                    />
                  </div>
                  <Button
                    onClick={handleAddInvite}
                    disabled={isCheckingUsername || !inviteInput}
                    className="h-12 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black shadow-md shadow-blue-200"
                  >
                    {isCheckingUsername ? "..." : "Add"}
                  </Button>
                </div>

                {/* Email Invite UI */}
                {showEmailInvite && (
                  <div className="mt-3 bg-white/80 rounded-xl p-3 border border-blue-200 animate-fade-in">
                    <p className="text-xs font-bold text-blue-800 mb-2">Invite friend via email:</p>
                    <div className="flex gap-2">
                      <Input
                        placeholder="friend@example.com"
                        value={emailInput}
                        onChange={(e) => setEmailInput(e.target.value)}
                        className="h-10 rounded-lg text-sm bg-white"
                      />
                      <Button onClick={handleAddEmailInvite} className="h-10 px-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg">
                        Send
                      </Button>
                    </div>
                  </div>
                )}

                <p className="text-[11px] text-blue-800/60 font-bold pl-1 mt-1">
                  Try searching for your friend's username (e.g., @ali_khan)
                </p>
              </div>

              {/* LIST OF ADDED PEOPLE */}
              <div>
                <p className="text-xs font-black text-[#4a6850]/80 mb-3 uppercase mx-1 flex justify-between items-center">
                  <span>Who's In? ({groupMembers.length + invitedUsernames.length + invitedEmails.length + 1})</span>
                  <span className="text-[10px] bg-[#4a6850]/10 text-[#4a6850] px-2 py-0.5 rounded-full">Step 2 of 3</span>
                </p>

                <div className="space-y-2">
                  {/* YOU */}
                  <div className="flex items-center gap-3 p-3 bg-white border border-[#4a6850]/10 rounded-2xl">
                    <Avatar name="You" size="sm" />
                    <div className="flex-1">
                      <span className="font-black text-sm text-gray-900">You</span>
                      <span className="text-xs text-[#4a6850] font-bold block">Admin</span>
                    </div>
                  </div>

                  {/* INVITED EMAILS (New Users) */}
                  {invitedEmails.map(email => (
                    <div
                      key={email}
                      className="flex items-center gap-3 p-3 bg-purple-50/50 border border-purple-100 rounded-2xl animate-fade-in"
                      title="This person will receive an email invitation to join Hostel Ledger and this group."
                    >
                      <div className="w-9 h-9 rounded-full bg-purple-100 flex items-center justify-center text-sm font-bold text-purple-600">
                        @
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="font-black text-sm text-gray-900 block truncate">{email}</span>
                        <span className="text-[10px] text-purple-600 font-bold flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse"></span> Email Invite • New User
                        </span>
                      </div>
                      <button onClick={() => handleRemoveEmailInvite(email)} className="w-8 h-8 rounded-full bg-red-100/50 hover:bg-red-100 flex items-center justify-center text-red-500 transition-colors">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}

                  {/* INVITED USERS (Existing App Users) */}
                  {invitedUsernames.map(username => (
                    <div
                      key={username}
                      className="flex items-center gap-3 p-3 bg-emerald-50/50 border border-emerald-100 rounded-2xl animate-fade-in"
                      title="This user already has a Hostel Ledger account. They'll receive an in-app invitation and email notification."
                    >
                      <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center text-sm font-bold text-emerald-600">
                        {username.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <span className="font-black text-sm text-gray-900 block">@{username}</span>
                        <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> App User • Invite Sent
                        </span>
                      </div>
                      <button onClick={() => handleRemoveInvite(username)} className="w-8 h-8 rounded-full bg-red-100/50 hover:bg-red-100 flex items-center justify-center text-red-500 transition-colors">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}

                  {/* MANUAL MEMBERS */}
                  {groupMembers.map((member) => (
                    <div key={member.name} className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-100 rounded-2xl">
                      <Avatar name={member.name} size="sm" />
                      <div className="flex-1 min-w-0">
                        <span className="font-black block text-gray-900 text-sm truncate">{member.name}</span>
                        <span className="text-[10px] text-gray-400 font-bold">Temporary Member</span>
                      </div>
                      <button onClick={() => handleRemoveMember(member.name)} className="w-8 h-8 rounded-full bg-gray-200 hover:bg-red-100 hover:text-red-500 flex items-center justify-center text-gray-500 transition-colors">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>


              {/* LEGACY / MANUAL ADD SECTION (Collapsible) */}
              <div className="pt-4 border-t border-[#4a6850]/10">
                <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200/60">
                  <h4 className="text-xs font-black text-gray-500 mb-3 uppercase flex items-center gap-2">
                    Can't find them? Add Temporary Member
                  </h4>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Just a name (e.g. John)"
                      value={memberName}
                      onChange={(e) => setMemberName(e.target.value)}
                      className="h-10 rounded-xl bg-white border-gray-200 text-sm"
                    />
                    <Button
                      onClick={handleAddMember}
                      disabled={!memberName.trim()}
                      className="h-10 px-4 rounded-xl bg-gray-800 text-white font-bold text-xs"
                    >
                      Add
                    </Button>
                  </div>
                  <p className="text-[10px] text-gray-400 font-medium mt-2 leading-tight">
                    Temporary members can't be invited via email. They are just placeholders for expense tracking.
                  </p>
                </div>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-6 animate-fade-in pt-4">
              <div className="text-center">
                <div className="inline-block relative">
                  <div className="w-24 h-24 bg-gradient-to-br from-[#4a6850] to-[#3d5643] rounded-[2rem] flex items-center justify-center text-5xl shadow-xl shadow-[#4a6850]/20 mb-4 mx-auto">
                    {groupEmoji}
                  </div>
                  {coverPhoto && (
                    <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-full border-4 border-white overflow-hidden shadow-lg">
                      <img src={coverPhoto} className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
                <h2 className="text-2xl font-black text-gray-900 mb-1">{groupName}</h2>
                <p className="text-sm font-bold text-[#4a6850]">
                  {groupMembers.length + invitedUsernames.length + 1} People
                </p>
              </div>

              <div className="bg-white border border-[#4a6850]/10 rounded-2xl p-1 divide-y divide-[#4a6850]/5">
                <div className="p-3 flex items-center justify-between">
                  <span className="text-sm font-bold text-gray-500">You (Admin)</span>
                  <span className="text-xs font-black bg-[#4a6850]/10 text-[#4a6850] px-2 py-0.5 rounded-lg">Creator</span>
                </div>
                {invitedUsernames.map(u => (
                  <div key={u} className="p-3 flex items-center justify-between">
                    <span className="text-sm font-bold text-gray-900">@{u}</span>
                    <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg">Invite</span>
                  </div>
                ))}
                {groupMembers.map(m => (
                  <div key={m.name} className="p-3 flex items-center justify-between">
                    <span className="text-sm font-bold text-gray-900">{m.name}</span>
                    <span className="text-xs font-bold text-gray-400 bg-gray-50 px-2 py-0.5 rounded-lg">Temp</span>
                  </div>
                ))}
              </div>

              <div className="p-4 bg-green-50 border border-green-100 rounded-2xl">
                <p className="text-xs text-green-800 font-medium text-center leading-relaxed">
                  <strong>🎉 Almost done!</strong>
                  {invitedUsernames.length > 0 ? (
                    <span className="block mt-1">
                      We will send invitations to <strong>{invitedUsernames.length}</strong> people immediately after you create the group.
                    </span>
                  ) : (
                    <span className="block mt-1">
                      You can always invite more people later using their username!
                    </span>
                  )}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="flex-shrink-0 pt-4 border-t border-[#4a6850]/10 bg-white">
          <div className="flex gap-3">
            {currentStep > 1 && (
              <Button
                variant="secondary"
                onClick={() => setCurrentStep(currentStep - 1)}
                className="flex-1 h-14 rounded-2xl bg-gray-100 hover:bg-gray-200 font-black text-sm text-gray-600"
              >
                Back
              </Button>
            )}
            {currentStep < 3 ? (
              <Button
                onClick={() => setCurrentStep(currentStep + 1)}
                disabled={currentStep === 1 && !canProceedToStep2}
                className="flex-1 h-14 rounded-2xl bg-gradient-to-r from-[#4a6850] to-[#3d5643] text-white font-black disabled:opacity-50 text-base shadow-lg shadow-[#4a6850]/20"
              >
                Continue <ChevronRight className="w-5 h-5 ml-1.5" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                className="w-full h-14 rounded-2xl bg-gradient-to-r from-[#4a6850] to-[#3d5643] text-white font-black text-lg shadow-xl shadow-[#4a6850]/30 hover:scale-[1.02] transition-transform"
              >
                Create Group 🚀
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default CreateGroupSheet;
