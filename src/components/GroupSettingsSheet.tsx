import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Avatar from "./Avatar";
import { UserPlus, Trash2, AlertTriangle, X } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Member {
  id: string;
  name: string;
  isCurrentUser?: boolean;
  balance?: number;
  paymentDetails?: any;
  phone?: string | null;
}

interface GroupSettingsSheetProps {
  open: boolean;
  onClose: () => void;
  group: {
    id: string;
    name: string;
    emoji: string;
    members: Member[];
  };
  onAddMember: (name: string) => void;
  onRemoveMember: (memberId: string) => void;
  onUpdateGroup: (data: { name?: string; emoji?: string }) => void;
  onDeleteGroup: () => void;
}

const EMOJIS = ["🏠", "🍕", "🎮", "📚", "🏖️", "🎭", "⚽", "🎸", "🚗", "✈️"];

const GroupSettingsSheet = ({
  open,
  onClose,
  group,
  onAddMember,
  onRemoveMember,
  onUpdateGroup,
  onDeleteGroup,
}: GroupSettingsSheetProps) => {
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMemberName, setNewMemberName] = useState("");
  const [memberToRemove, setMemberToRemove] = useState<Member | null>(null);
  const [showDeleteGroup, setShowDeleteGroup] = useState(false);
  const [groupName, setGroupName] = useState(group.name);
  const [selectedEmoji, setSelectedEmoji] = useState(group.emoji);

  const handleAddMember = () => {
    if (newMemberName.trim()) {
      onAddMember(newMemberName.trim());
      setNewMemberName("");
      setShowAddMember(false);
    }
  };

  const handleRemoveMember = () => {
    if (memberToRemove) {
      onRemoveMember(memberToRemove.id);
      setMemberToRemove(null);
    }
  };

  const handleUpdateGroup = () => {
    if (groupName !== group.name || selectedEmoji !== group.emoji) {
      onUpdateGroup({ name: groupName, emoji: selectedEmoji });
    }
  };

  const nonCurrentMembers = group.members.filter((m) => !m.isCurrentUser);

  return (
    <>
      <Sheet open={open} onOpenChange={onClose}>
        <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl flex flex-col bg-white shadow-[0_25px_70px_rgba(74,104,80,0.3)] border-t-2 border-[#4a6850]/20 z-[100]">
          <SheetHeader className="flex-shrink-0 mb-6 bg-gradient-to-r from-[#4a6850]/5 to-[#3d5643]/5 -mx-6 -mt-6 px-6 pt-6 pb-4 rounded-t-3xl border-b border-[#4a6850]/10">
            <SheetTitle className="text-center font-black text-xl tracking-tight text-gray-900">Group Settings</SheetTitle>
            <SheetDescription className="text-center text-sm text-[#4a6850]/80 font-bold">
              Manage group details, members, and preferences
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto space-y-6 pb-4">
            {/* Group Name & Emoji */}
            <div className="space-y-6">
              <div>
                <Label htmlFor="groupName" className="text-sm font-black text-[#4a6850]/80 mb-3 block uppercase tracking-wide">Group Name</Label>
                <Input
                  id="groupName"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  onBlur={handleUpdateGroup}
                  className="h-14 rounded-3xl border-[#4a6850]/20 shadow-lg font-bold text-gray-900 focus:border-[#4a6850] focus:shadow-xl"
                />
              </div>

              <div>
                <Label className="text-sm font-black text-[#4a6850]/80 mb-4 block uppercase tracking-wide">Group Icon</Label>
                <div className="flex flex-wrap gap-3 mt-1.5">
                  {EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => {
                        setSelectedEmoji(emoji);
                        onUpdateGroup({ emoji });
                      }}
                      className={`w-14 h-14 rounded-3xl text-2xl flex items-center justify-center transition-all shadow-lg hover:shadow-xl ${
                        selectedEmoji === emoji
                          ? "bg-gradient-to-br from-[#4a6850] to-[#3d5643] text-white scale-110 border-2 border-[#4a6850]"
                          : "bg-white hover:bg-[#4a6850]/5 border border-[#4a6850]/10 hover:border-[#4a6850]/20"
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Members Section */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <Label className="text-sm font-black text-[#4a6850]/80 uppercase tracking-wide">Members ({group.members.length})</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAddMember(true)}
                  className="text-[#4a6850] hover:bg-[#4a6850]/10 font-black rounded-2xl shadow-lg hover:shadow-xl transition-all"
                >
                  <UserPlus className="w-4 h-4 mr-1" />
                  Add
                </Button>
              </div>

              {/* Add Member Input */}
              {showAddMember && (
                <div className="flex gap-3 mb-6 animate-fade-in bg-gradient-to-br from-[#4a6850]/5 to-[#3d5643]/5 rounded-3xl p-5 border border-[#4a6850]/20 shadow-lg">
                  <Input
                    placeholder="Member name"
                    value={newMemberName}
                    onChange={(e) => setNewMemberName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddMember()}
                    className="h-12 rounded-2xl border-[#4a6850]/20 shadow-lg font-bold text-gray-900 placeholder:text-[#4a6850]/60 focus:border-[#4a6850] bg-white"
                    autoFocus
                  />
                  <Button 
                    onClick={handleAddMember} 
                    disabled={!newMemberName.trim()}
                    className="h-12 px-6 bg-gradient-to-r from-[#4a6850] to-[#3d5643] hover:from-[#3d5643] hover:to-[#2f4336] text-white font-black rounded-2xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
                  >
                    Add
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setShowAddMember(false);
                      setNewMemberName("");
                    }}
                    className="h-12 w-12 rounded-2xl hover:bg-gray-100 shadow-lg hover:shadow-xl transition-all"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}

              {/* Members List */}
              <div className="space-y-3">
                {group.members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center gap-4 p-5 rounded-3xl bg-white border border-[#4a6850]/10 shadow-lg hover:shadow-xl hover:border-[#4a6850]/20 transition-all"
                  >
                    <Avatar name={member.name} size="sm" />
                    <div className="flex-1">
                      <p className="font-black text-gray-900 tracking-tight">
                        {member.name}
                        {member.isCurrentUser && (
                          <span className="text-[#4a6850]/80 text-sm ml-2 font-bold">(You)</span>
                        )}
                      </p>
                      {member.balance !== 0 && (
                        <p className={`text-sm font-bold ${member.balance > 0 ? "text-[#4a6850]" : "text-red-600"}`}>
                          {member.balance > 0 ? `Owes Rs ${member.balance.toLocaleString()}` : `Owed Rs ${Math.abs(member.balance).toLocaleString()}`}
                        </p>
                      )}
                    </div>
                    {!member.isCurrentUser && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setMemberToRemove(member)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 w-10 h-10 rounded-2xl shadow-lg hover:shadow-xl transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Danger Zone */}
            <div className="pt-6 border-t border-[#4a6850]/10">
              <Label className="text-red-600 font-black text-sm uppercase tracking-wide">Danger Zone</Label>
              <Button
                variant="destructive"
                className="w-full mt-4 h-14 rounded-3xl bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white font-black shadow-[0_8px_32px_rgba(239,68,68,0.3)] hover:shadow-[0_12px_40px_rgba(239,68,68,0.4)] transition-all"
                onClick={() => setShowDeleteGroup(true)}
              >
                <Trash2 className="w-5 h-5 mr-2" />
                Delete Group
              </Button>
            </div>
          </div>

          <div className="pt-6 border-t border-[#4a6850]/10 mt-auto bg-white flex-shrink-0">
            <Button 
              onClick={onClose} 
              variant="secondary" 
              className="w-full h-14 rounded-3xl font-black shadow-lg hover:shadow-xl transition-all"
            >
              Done
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Remove Member Confirmation */}
      <AlertDialog open={!!memberToRemove} onOpenChange={() => setMemberToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Remove {memberToRemove?.name}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {memberToRemove?.balance !== 0 ? (
                <>
                  <span className="text-destructive font-medium">Warning:</span> {memberToRemove?.name} has an unsettled balance of Rs {Math.abs(memberToRemove?.balance || 0)}.
                  Removing them will clear this balance.
                </>
              ) : (
                `${memberToRemove?.name} will be removed from the group. Their transaction history will be preserved.`
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveMember}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Group Confirmation */}
      <AlertDialog open={showDeleteGroup} onOpenChange={setShowDeleteGroup}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Delete {group.name}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the group and all its transactions. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onDeleteGroup();
                setShowDeleteGroup(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Group
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default GroupSettingsSheet;