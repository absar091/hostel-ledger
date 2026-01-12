import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
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
      <SheetContent side="bottom" className="h-[90vh] rounded-t-3xl flex flex-col">
        <SheetHeader className="flex-shrink-0 mb-4">
          <SheetTitle className="text-center">Create New Group</SheetTitle>
          <div className="sr-only">
            Create a new group to split expenses with friends or roommates
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto space-y-5 pb-4">
          {/* Group Preview */}
          <div className="flex items-center justify-center animate-fade-in">
            <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center text-3xl shadow-card">
              {emoji}
            </div>
          </div>

          {/* Group Name */}
          <div className="animate-fade-in" style={{ animationDelay: "0.05s" }}>
            <label className="text-sm font-medium text-muted-foreground mb-2 block">
              Group Name
            </label>
            <Input
              placeholder="e.g., Roommates, Trip Friends"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-11"
              autoFocus
            />
          </div>

          {/* Emoji Picker */}
          <div className="animate-fade-in" style={{ animationDelay: "0.1s" }}>
            <label className="text-sm font-medium text-muted-foreground mb-2 block">
              Choose an Icon
            </label>
            <div className="grid grid-cols-8 gap-1.5">
              {EMOJI_OPTIONS.map((e) => (
                <button
                  key={e}
                  onClick={() => setEmoji(e)}
                  className={cn(
                    "w-9 h-9 rounded-lg flex items-center justify-center text-lg transition-all",
                    emoji === e
                      ? "bg-primary/10 border-2 border-primary scale-110"
                      : "bg-secondary hover:bg-secondary/80"
                  )}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          {/* Add Members Section */}
          <div className="animate-fade-in border-t pt-4" style={{ animationDelay: "0.15s" }}>
            <label className="text-sm font-medium text-muted-foreground mb-3 block">
              Add Members
            </label>
            
            {/* Member Name & Phone */}
            <div className="space-y-3 bg-secondary/50 rounded-xl p-3">
              <Input
                placeholder="Member name *"
                value={memberName}
                onChange={(e) => setMemberName(e.target.value)}
                onKeyPress={handleKeyPress}
                className="h-11"
              />
              
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Phone (optional)"
                  value={memberPhone}
                  onChange={(e) => setMemberPhone(e.target.value)}
                  className="h-11 pl-10"
                />
              </div>

              {/* Toggle Payment Details */}
              <button
                type="button"
                onClick={() => setShowPaymentFields(!showPaymentFields)}
                className="w-full flex items-center justify-between p-3 bg-background rounded-lg text-sm"
              >
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    {hasPaymentInfo ? "Payment details added" : "Add payment details (optional)"}
                  </span>
                </div>
                {showPaymentFields ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                )}
              </button>

              {/* Payment Details Fields */}
              {showPaymentFields && (
                <div className="space-y-3 pt-2 animate-fade-in">
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      placeholder="JazzCash"
                      value={jazzCash}
                      onChange={(e) => setJazzCash(e.target.value)}
                      className="h-10 text-sm"
                    />
                    <Input
                      placeholder="Easypaisa"
                      value={easypaisa}
                      onChange={(e) => setEasypaisa(e.target.value)}
                      className="h-10 text-sm"
                    />
                  </div>
                  
                  <Select value={bankName} onValueChange={setBankName}>
                    <SelectTrigger className="h-10 text-sm">
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
                      className="h-10 text-sm"
                    />
                  )}

                  <Input
                    placeholder="Raast ID"
                    value={raastId}
                    onChange={(e) => setRaastId(e.target.value)}
                    className="h-10 text-sm"
                  />
                </div>
              )}

              <Button
                onClick={handleAddMember}
                disabled={!memberName.trim()}
                className="w-full h-10"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Member
              </Button>
            </div>
          </div>

          {/* Members List */}
          <div className="space-y-2 animate-fade-in" style={{ animationDelay: "0.2s" }}>
            <p className="text-sm font-medium text-muted-foreground">
              Members ({members.length + 1})
            </p>
            
            {/* You (always included) */}
            <div className="flex items-center gap-3 p-3 bg-primary/5 border border-primary/20 rounded-xl">
              <Avatar name="You" size="sm" />
              <span className="font-medium flex-1">You</span>
              <span className="text-xs text-primary font-medium">Creator</span>
            </div>

            {/* Added members */}
            {members.map((member) => (
              <div
                key={member.name}
                className="flex items-center gap-3 p-3 bg-secondary rounded-xl"
              >
                <Avatar name={member.name} size="sm" />
                <div className="flex-1 min-w-0">
                  <span className="font-medium block">{member.name}</span>
                  {(member.phone || member.paymentDetails) && (
                    <span className="text-xs text-muted-foreground">
                      {member.phone && `📱 ${member.phone}`}
                      {member.paymentDetails && " • 💳 Payment info added"}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => handleRemoveMember(member.name)}
                  className="w-6 h-6 rounded-full bg-destructive/10 flex items-center justify-center hover:bg-destructive/20 transition-colors"
                >
                  <X className="w-3 h-3 text-destructive" />
                </button>
              </div>
            ))}

            {members.length === 0 && (
              <div className="text-center py-4 text-muted-foreground">
                <Users className="w-6 h-6 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Add members to split expenses with</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex-shrink-0 pt-4 border-t bg-background">
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="w-full h-12"
          >
            Create Group
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default CreateGroupSheet;
