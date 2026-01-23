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

  useEffect(() => {
    console.log(`📍 Current Step: ${currentStep}`);
  }, [currentStep]);

  const resetForm = () => {
    setCurrentStep(1);
    setGroupName("");
    setGroupEmoji("🏠");
    setCoverPhoto("");
    setGroupMembers([]);
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

  const handleRemoveMember = (name: string) => {
    setGroupMembers(groupMembers.filter((m) => m.name !== name));
  };

  const handleSubmit = () => {
    onSubmit({
      name: groupName,
      emoji: groupEmoji,
      members: groupMembers,
      coverPhoto: coverPhoto || undefined,
    });
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
            {currentStep === 1 && "Name & Icon"}
            {currentStep === 2 && "Add Members"}
            {currentStep === 3 && "Review & Create"}
          </SheetTitle>
          <SheetDescription className="text-center text-sm text-[#4a6850]/80 font-bold">
            {currentStep === 1 && "Set up your group details"}
            {currentStep === 2 && "Add members to split expenses with"}
            {currentStep === 3 && "Review and create your group"}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto pb-4">
          {currentStep === 1 && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <label className="text-xs font-black text-[#4a6850]/80 mb-2 block uppercase">
                  Cover Photo (Optional)
                </label>
                <div className="relative">
                  {coverPhoto ? (
                    <div className="relative w-full h-32 rounded-2xl overflow-hidden border-2 border-[#4a6850]/20">
                      <img src={coverPhoto} alt="Cover" className="w-full h-full object-cover" />
                      <button
                        onClick={() => setCoverPhoto("")}
                        className="absolute top-2 right-2 w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-[#4a6850]/30 rounded-2xl cursor-pointer hover:bg-[#4a6850]/5 transition-all">
                      <ImageIcon className="w-8 h-8 text-[#4a6850]/60 mb-2" />
                      <span className="text-sm font-bold text-[#4a6850]/80">
                        {uploadingPhoto ? "Uploading..." : "Click to upload cover photo"}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleCoverPhotoUpload}
                        disabled={uploadingPhoto}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>

              <div>
                <label className="text-xs font-black text-[#4a6850]/80 mb-2 block uppercase">
                  Group Name *
                </label>
                <Input
                  placeholder="e.g., Roommates, Trip Friends"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="h-12 rounded-2xl border-[#4a6850]/20 shadow-md font-bold"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-xs font-black text-[#4a6850]/80 mb-3 block uppercase">
                  Choose Icon
                </label>
                <div className="grid grid-cols-8 gap-2">
                  {EMOJI_OPTIONS.map((e) => (
                    <button
                      key={e}
                      onClick={() => setGroupEmoji(e)}
                      className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center text-xl transition-all shadow-md",
                        groupEmoji === e
                          ? "bg-gradient-to-br from-[#4a6850] to-[#3d5643] scale-110"
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
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center justify-center mb-4">
                <div className="inline-flex items-center gap-2 bg-[#4a6850]/10 rounded-2xl px-4 py-2">
                  <span className="text-xl">{groupEmoji}</span>
                  <span className="text-sm font-black text-[#4a6850]">{groupName}</span>
                </div>
              </div>

              <div className="bg-gradient-to-br from-[#4a6850]/5 to-[#3d5643]/5 rounded-2xl p-4 border border-[#4a6850]/20 shadow-md">
                <div className="space-y-3">
                  <Input
                    placeholder="Member name *"
                    value={memberName}
                    onChange={(e) => setMemberName(e.target.value)}
                    className="h-12 rounded-2xl bg-white"
                  />
                  
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4a6850]/60" />
                    <Input
                      placeholder="Phone (optional)"
                      value={memberPhone}
                      onChange={(e) => setMemberPhone(e.target.value)}
                      className="h-12 pl-11 rounded-2xl bg-white"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowPaymentFields(!showPaymentFields)}
                    className="w-full flex items-center justify-between p-3 bg-white rounded-2xl text-sm border border-[#4a6850]/10"
                  >
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-[#4a6850]/60" />
                      <span className="text-[#4a6850]/80 font-bold text-xs">
                        {hasPaymentInfo ? "Payment details added" : "Add payment details (optional)"}
                      </span>
                    </div>
                    {showPaymentFields ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>

                  {showPaymentFields && (
                    <div className="space-y-3 pt-1">
                      <div className="grid grid-cols-2 gap-2">
                        <Input placeholder="JazzCash" value={jazzCash} onChange={(e) => setJazzCash(e.target.value)} className="h-10 text-sm rounded-xl bg-white" />
                        <Input placeholder="Easypaisa" value={easypaisa} onChange={(e) => setEasypaisa(e.target.value)} className="h-10 text-sm rounded-xl bg-white" />
                      </div>
                      <Select value={bankName} onValueChange={setBankName}>
                        <SelectTrigger className="h-10 text-sm rounded-xl bg-white z-[110]">
                          <SelectValue placeholder="Select bank" />
                        </SelectTrigger>
                        <SelectContent className="z-[120]">
                          {BANKS.map((bank) => (
                            <SelectItem key={bank} value={bank}>{bank}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {bankName && (
                        <Input placeholder="Account number" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} className="h-10 text-sm rounded-xl bg-white" />
                      )}
                      <Input placeholder="Raast ID" value={raastId} onChange={(e) => setRaastId(e.target.value)} className="h-10 text-sm rounded-xl bg-white" />
                    </div>
                  )}

                  <Button
                    onClick={handleAddMember}
                    disabled={!memberName.trim()}
                    className="w-full h-11 rounded-2xl bg-gradient-to-r from-[#4a6850] to-[#3d5643]"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Member
                  </Button>
                </div>
              </div>

              <div>
                <p className="text-xs font-black text-[#4a6850]/80 mb-3 uppercase">
                  Members ({groupMembers.length + 1})
                </p>
                
                <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-[#4a6850]/10 to-[#3d5643]/10 border border-[#4a6850]/20 rounded-2xl mb-3">
                  <Avatar name="You" size="sm" />
                  <span className="font-black flex-1 text-gray-900 text-sm">You</span>
                  <span className="text-xs text-[#4a6850] font-black bg-[#4a6850]/10 px-2 py-1 rounded-xl">Creator</span>
                </div>

                <div className="space-y-2">
                  {groupMembers.map((member) => (
                    <div key={member.name} className="flex items-center gap-3 p-4 bg-white border border-[#4a6850]/10 rounded-2xl">
                      <Avatar name={member.name} size="sm" />
                      <div className="flex-1 min-w-0">
                        <span className="font-black block text-gray-900 text-sm truncate">{member.name}</span>
                        {(member.phone || member.paymentDetails) && (
                          <span className="text-xs text-[#4a6850]/80 font-bold truncate block">
                            {member.phone && `📱 ${member.phone}`}
                            {member.paymentDetails && " • 💳"}
                          </span>
                        )}
                      </div>
                      <button onClick={() => handleRemoveMember(member.name)} className="w-7 h-7 rounded-full bg-red-100 flex items-center justify-center">
                        <X className="w-3.5 h-3.5 text-red-600" />
                      </button>
                    </div>
                  ))}
                </div>

                {groupMembers.length === 0 && (
                  <div className="text-center py-6 bg-white rounded-2xl border border-[#4a6850]/10">
                    <Users className="w-6 h-6 mx-auto mb-2 text-[#4a6850]/60" />
                    <p className="text-xs text-[#4a6850]/80 font-bold">Add members to split expenses with</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-4 animate-fade-in">
              <div className="bg-gradient-to-br from-[#4a6850] to-[#3d5643] rounded-2xl p-5 shadow-lg text-white">
                {coverPhoto && (
                  <div className="w-full h-24 rounded-xl overflow-hidden mb-4">
                    <img src={coverPhoto} alt="Cover" className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-xl bg-white/20 flex items-center justify-center text-3xl">
                    {groupEmoji}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-black text-xl truncate">{groupName}</h3>
                    <p className="text-sm text-white/90 font-bold">{groupMembers.length + 1} members</p>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-xs font-black text-[#4a6850]/80 mb-3 uppercase">Group Members</p>
                
                <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-[#4a6850]/10 to-[#3d5643]/10 border border-[#4a6850]/20 rounded-2xl mb-2">
                  <Avatar name="You" size="sm" />
                  <span className="font-black flex-1 text-gray-900 text-sm">You</span>
                  <span className="text-xs text-[#4a6850] font-black bg-[#4a6850]/10 px-2 py-1 rounded-xl">Creator</span>
                </div>

                <div className="space-y-2">
                  {groupMembers.map((member) => (
                    <div key={member.name} className="flex items-center gap-3 p-4 bg-white border border-[#4a6850]/10 rounded-2xl">
                      <Avatar name={member.name} size="sm" />
                      <div className="flex-1 min-w-0">
                        <span className="font-black block text-gray-900 text-sm truncate">{member.name}</span>
                        {(member.phone || member.paymentDetails) && (
                          <span className="text-xs text-[#4a6850]/80 font-bold truncate block">
                            {member.phone && `📱 ${member.phone}`}
                            {member.paymentDetails && " • 💳 Payment info"}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {groupMembers.length === 0 && (
                  <div className="text-center py-6 bg-white rounded-2xl border border-[#4a6850]/10">
                    <p className="text-xs text-[#4a6850]/80 font-bold">Just you in this group</p>
                    <p className="text-xs text-gray-500 mt-1">You can add members later</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex-shrink-0 pt-6 border-t border-[#4a6850]/10 bg-white">
          <div className="flex gap-4">
            {currentStep > 1 && (
              <Button
                variant="secondary"
                onClick={() => setCurrentStep(currentStep - 1)}
                className="flex-1 h-14 rounded-3xl bg-gray-100 hover:bg-gray-200 font-black"
              >
                Back
              </Button>
            )}
            {currentStep < 3 ? (
              <Button
                onClick={() => setCurrentStep(currentStep + 1)}
                disabled={currentStep === 1 && !canProceedToStep2}
                className="flex-1 h-14 rounded-3xl bg-gradient-to-r from-[#4a6850] to-[#3d5643] text-white font-black disabled:opacity-50"
              >
                Continue <ChevronRight className="w-5 h-5 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                className="w-full h-14 rounded-3xl bg-gradient-to-r from-[#4a6850] to-[#3d5643] text-white font-black"
              >
                Create Group
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default CreateGroupSheet;
