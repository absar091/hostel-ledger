import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Plus, Users, ChevronDown, ChevronUp, Phone, CreditCard } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Avatar from "./Avatar";
import { cn } from "@/lib/utils";

const EMOJI_OPTIONS = [
  "🏠", "🍽️", "✈️", "🎉", "🛒", "☕", "🎬", "🏋️", 
  "🎮", "📚", "🚗", "🏖️", "🎂", "💼", "🎸", "⚽"
];

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
  }) => void;
}

const CreateGroupSheet = ({ open, onClose, onSubmit }: CreateGroupSheetProps) => {
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("🏠");
  const [members, setMembers] = useState<MemberData[]>([]);
  
  // New member form state
  const [memberName, setMemberName] = useState("");
  const [memberPhone, setMemberPhone] = useState("");
  const [showPaymentFields, setShowPaymentFields] = useState(false);
  const [jazzCash, setJazzCash] = useState("");
  const [easypaisa, setEasypaisa] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [raastId, setRaastId] = useState("");

  const resetMemberForm = () => {
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
    setName("");
    setEmoji("🏠");
    setMembers([]);
    resetMemberForm();
    onClose();
  };

  const handleAddMember = () => {
    if (memberName.trim() && !members.some(m => m.name === memberName.trim())) {
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

      setMembers([...members, newMember]);
      resetMemberForm();
    }
  };

  const handleRemoveMember = (memberName: string) => {
    setMembers(members.filter((m) => m.name !== memberName));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddMember();
    }
  };

  const handleSubmit = () => {
    onSubmit({
      name,
      emoji,
      members,
    });
    handleClose();
  };

  const canSubmit = name.trim().length > 0;
  const hasPaymentInfo = jazzCash || easypaisa || bankName || raastId;

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent side="bottom" className="max-h-[95vh] rounded-t-3xl flex flex-col bg-white border-t border-[#4a6850]/10 shadow-[0_-20px_60px_rgba(74,104,80,0.1)] z-[100]">
        <SheetHeader className="flex-shrink-0 mb-6 pt-2">
          {/* Handle Bar */}
          <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-4"></div>
          
          <SheetTitle className="text-center text-2xl font-black text-gray-900 tracking-tight">Create New Group</SheetTitle>
          <SheetDescription className="text-center text-sm text-[#4a6850]/80 font-bold">
            Create a new group to split expenses with friends or roommates
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto pb-4">
          {/* Group Preview - iPhone Style */}
          <div className="flex items-center justify-center animate-fade-in mb-8">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-[#4a6850]/10 to-[#3d5643]/10 flex items-center justify-center text-4xl shadow-lg border border-[#4a6850]/20">
              {emoji}
            </div>
          </div>

          {/* Group Name - iPhone Style */}
          <div className="animate-fade-in mb-8" style={{ animationDelay: "0.05s" }}>
            <label className="text-sm font-black text-[#4a6850]/80 mb-3 block uppercase tracking-wide">
              Group Name
            </label>
            <Input
              placeholder="e.g., Roommates, Trip Friends"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-14 rounded-3xl border-[#4a6850]/20 shadow-lg font-bold text-gray-900 placeholder:text-[#4a6850]/60 focus:border-[#4a6850] focus:shadow-xl"
              autoFocus
            />
          </div>

          {/* Emoji Picker - iPhone Style */}
          <div className="animate-fade-in mb-8" style={{ animationDelay: "0.1s" }}>
            <label className="text-sm font-black text-[#4a6850]/80 mb-4 block uppercase tracking-wide">
              Choose an Icon
            </label>
            <div className="grid grid-cols-8 gap-2">
              {EMOJI_OPTIONS.map((e) => (
                <button
                  key={e}
                  onClick={() => setEmoji(e)}
                  className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center text-xl transition-all shadow-lg hover:shadow-xl",
                    emoji === e
                      ? "bg-gradient-to-br from-[#4a6850] to-[#3d5643] border-2 border-[#4a6850] scale-110 text-white"
                      : "bg-white hover:bg-[#4a6850]/5 border border-[#4a6850]/10 hover:border-[#4a6850]/20"
                  )}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          {/* Add Members Section - iPhone Style */}
          <div className="animate-fade-in border-t border-[#4a6850]/10 pt-6" style={{ animationDelay: "0.15s" }}>
            <label className="text-sm font-black text-[#4a6850]/80 mb-4 block uppercase tracking-wide">
              Add Members
            </label>
            
            {/* Member Name & Phone - iPhone Style */}
            <div className="bg-gradient-to-br from-[#4a6850]/5 to-[#3d5643]/5 rounded-3xl p-5 border border-[#4a6850]/20 shadow-lg mb-6">
              <div className="space-y-4">
                <Input
                  placeholder="Member name *"
                  value={memberName}
                  onChange={(e) => setMemberName(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="h-14 rounded-3xl border-[#4a6850]/20 shadow-lg font-bold text-gray-900 placeholder:text-[#4a6850]/60 focus:border-[#4a6850] focus:shadow-xl bg-white"
                />
                
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#4a6850]/60" />
                  <Input
                    placeholder="Phone (optional)"
                    value={memberPhone}
                    onChange={(e) => setMemberPhone(e.target.value)}
                    className="h-14 pl-14 rounded-3xl border-[#4a6850]/20 shadow-lg font-bold text-gray-900 placeholder:text-[#4a6850]/60 focus:border-[#4a6850] focus:shadow-xl bg-white"
                  />
                </div>

                {/* Toggle Payment Details - iPhone Style */}
                <button
                  type="button"
                  onClick={() => setShowPaymentFields(!showPaymentFields)}
                  className="w-full flex items-center justify-between p-4 bg-white rounded-3xl text-sm border border-[#4a6850]/10 shadow-lg hover:shadow-xl transition-all"
                >
                  <div className="flex items-center gap-3">
                    <CreditCard className="w-5 h-5 text-[#4a6850]/60" />
                    <span className="text-[#4a6850]/80 font-bold">
                      {hasPaymentInfo ? "Payment details added" : "Add payment details (optional)"}
                    </span>
                  </div>
                  {showPaymentFields ? (
                    <ChevronUp className="w-5 h-5 text-[#4a6850]/60" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-[#4a6850]/60" />
                  )}
                </button>

                {/* Payment Details Fields - iPhone Style */}
                {showPaymentFields && (
                  <div className="space-y-4 pt-2 animate-fade-in">
                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        placeholder="JazzCash"
                        value={jazzCash}
                        onChange={(e) => setJazzCash(e.target.value)}
                        className="h-12 text-sm rounded-2xl border-[#4a6850]/20 shadow-lg font-bold text-gray-900 placeholder:text-[#4a6850]/60 focus:border-[#4a6850] bg-white"
                      />
                      <Input
                        placeholder="Easypaisa"
                        value={easypaisa}
                        onChange={(e) => setEasypaisa(e.target.value)}
                        className="h-12 text-sm rounded-2xl border-[#4a6850]/20 shadow-lg font-bold text-gray-900 placeholder:text-[#4a6850]/60 focus:border-[#4a6850] bg-white"
                      />
                    </div>
                    
                    <Select value={bankName} onValueChange={setBankName}>
                      <SelectTrigger className="h-12 text-sm rounded-2xl border-[#4a6850]/20 shadow-lg font-bold text-gray-900 focus:border-[#4a6850] bg-white">
                        <SelectValue placeholder="Select bank (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        {BANKS.map((bank) => (
                          <SelectItem key={bank} value={bank}>
                            {bank}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {bankName && (
                      <Input
                        placeholder="Account number / IBAN"
                        value={accountNumber}
                        onChange={(e) => setAccountNumber(e.target.value)}
                        className="h-12 text-sm rounded-2xl border-[#4a6850]/20 shadow-lg font-bold text-gray-900 placeholder:text-[#4a6850]/60 focus:border-[#4a6850] bg-white"
                      />
                    )}

                    <Input
                      placeholder="Raast ID"
                      value={raastId}
                      onChange={(e) => setRaastId(e.target.value)}
                      className="h-12 text-sm rounded-2xl border-[#4a6850]/20 shadow-lg font-bold text-gray-900 placeholder:text-[#4a6850]/60 focus:border-[#4a6850] bg-white"
                    />
                  </div>
                )}

                <Button
                  onClick={handleAddMember}
                  disabled={!memberName.trim()}
                  className="w-full h-12 rounded-3xl bg-gradient-to-r from-[#4a6850] to-[#3d5643] hover:from-[#3d5643] hover:to-[#2f4a35] text-white font-black border-0 shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Add Member
                </Button>
              </div>
            </div>
          </div>

          {/* Members List - iPhone Style */}
          <div className="animate-fade-in" style={{ animationDelay: "0.2s" }}>
            <p className="text-sm font-black text-[#4a6850]/80 mb-4 uppercase tracking-wide">
              Members ({members.length + 1})
            </p>
            
            {/* You (always included) - iPhone Style */}
            <div className="flex items-center gap-4 p-5 bg-gradient-to-r from-[#4a6850]/10 to-[#3d5643]/10 border border-[#4a6850]/20 rounded-3xl mb-4 shadow-lg">
              <Avatar name="You" size="sm" />
              <span className="font-black flex-1 text-gray-900 tracking-tight">You</span>
              <span className="text-xs text-[#4a6850] font-black bg-[#4a6850]/10 px-3 py-1 rounded-2xl">Creator</span>
            </div>

            {/* Added members - iPhone Style */}
            <div className="space-y-3">
              {members.map((member) => (
                <div
                  key={member.name}
                  className="flex items-center gap-4 p-5 bg-white border border-[#4a6850]/10 rounded-3xl shadow-lg hover:shadow-xl transition-all"
                >
                  <Avatar name={member.name} size="sm" />
                  <div className="flex-1 min-w-0">
                    <span className="font-black block text-gray-900 tracking-tight">{member.name}</span>
                    {(member.phone || member.paymentDetails) && (
                      <span className="text-xs text-[#4a6850]/80 font-bold">
                        {member.phone && `📱 ${member.phone}`}
                        {member.paymentDetails && " • 💳 Payment info added"}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => handleRemoveMember(member.name)}
                    className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center hover:bg-red-200 transition-colors shadow-lg"
                  >
                    <X className="w-4 h-4 text-red-600" />
                  </button>
                </div>
              ))}
            </div>

            {members.length === 0 && (
              <div className="text-center py-8 bg-white rounded-3xl border border-[#4a6850]/10 shadow-lg">
                <Users className="w-8 h-8 mx-auto mb-3 text-[#4a6850]/60" />
                <p className="text-sm text-[#4a6850]/80 font-bold">Add members to split expenses with</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex-shrink-0 pt-6 border-t border-[#4a6850]/10 bg-white">
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="w-full h-14 rounded-3xl bg-gradient-to-r from-[#4a6850] to-[#3d5643] hover:from-[#3d5643] hover:to-[#2f4a35] text-white font-black border-0 shadow-[0_8px_32px_rgba(74,104,80,0.3)] hover:shadow-[0_12px_40px_rgba(74,104,80,0.4)] transition-all disabled:opacity-50"
          >
            Create Group
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default CreateGroupSheet;
