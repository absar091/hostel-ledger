import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Avatar from "./Avatar";
import { UserPlus, Trash2, AlertTriangle, X, ShieldAlert, Copy, Link, LogOut, Search, Loader2, CheckCircle2 } from "lucide-react";
import { getValidUserDetails } from "@/lib/api";
import { ReportSheet } from "./ReportSheet";
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
  userId?: string;
  isTemporary?: boolean;
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
  onAddMember: (member: { name: string; userId?: string; email?: string }) => void;
  onRemoveMember: (memberId: string) => void;
  onUpdateGroup: (data: { name?: string; emoji?: string }) => void;
  onDeleteGroup: () => void;
  onLeaveGroup: () => void;
  isOwner?: boolean;
}

import { toast } from "sonner";
import { Share2 } from "lucide-react";

const EMOJIS = ["🏠", "🍕", "🎮", "📚", "🏖️", "⚽", "🎸", "🚗", "✈️"];

const GroupSettingsSheet = ({
  open,
  onClose,
  group,
  onAddMember,
  onRemoveMember,
  onUpdateGroup,
  onDeleteGroup,
  onLeaveGroup,
  isOwner = false,
}: GroupSettingsSheetProps) => {
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMemberName, setNewMemberName] = useState("");
  const [memberToRemove, setMemberToRemove] = useState<Member | null>(null);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [showDeleteGroup, setShowDeleteGroup] = useState(false);
  const [groupName, setGroupName] = useState(group.name);
  const [selectedEmoji, setSelectedEmoji] = useState(group.emoji);
  const [showLeaveGroup, setShowLeaveGroup] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<any>(null);
  const [searchError, setSearchError] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");

  const currentUserMember = group.members.find(m => m.isCurrentUser);
  const userBalance = currentUserMember?.balance || 0;
  const hasUnsettledBalance = userBalance !== 0;

  const handleAddMember = (member: { name: string; userId?: string; email?: string }) => {
    if (member.name.trim()) {
      onAddMember(member);
      setNewMemberName("");
      setSearchResult(null);
      setSearchError(false);
      setShowAddMember(false);
    }
  };

  const handleSearch = async () => {
    if (!newMemberName.trim()) return;
    setIsSearching(true);
    setSearchError(false);
    setSearchResult(null);

    try {
      const result = await getValidUserDetails(newMemberName.trim());
      if (result.success && result.user) {
        setSearchResult(result.user);
      } else {
        setSearchError(true);
      }
    } catch (error) {
      setSearchError(true);
    } finally {
      setIsSearching(false);
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

  const handleInviteToClaim = (memberId: string, memberName: string) => {
    const inviteLink = `${window.location.origin}/join/${group.id}?claimMemberId=${memberId}`;
    navigator.clipboard.writeText(inviteLink);
    toast.success("Invite link copied!", {
      description: `Send this link to ${memberName} to let them claim this profile.`
    });
  };

  const handleCopyGroupInvite = () => {
    const inviteLink = `${window.location.origin}/join/${group.id}`;
    navigator.clipboard.writeText(inviteLink);
    toast.success("Group invite link copied!", {
      description: "Anyone with this link can join the group."
    });
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onClose}>
        <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl flex flex-col bg-white shadow-[0_25px_70px_rgba(74,104,80,0.3)] border-t-2 border-[#4a6850]/20 z-[100]">
          {/* Updated Header to match AddExpenseSheet style */}
          <SheetHeader className="flex-shrink-0 mb-6 pt-2 overflow-hidden">
            {/* Handle Bar */}
            <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-6"></div>

            <div className="flex flex-col items-center justify-center gap-1.5 px-4">
              <SheetTitle className="text-center font-black text-2xl tracking-tight text-gray-900">Group Settings</SheetTitle>
              <SheetDescription className="text-center text-xs text-[#4a6850]/80 font-bold max-w-[280px]">
                Manage group details, members, and preferences
              </SheetDescription>
            </div>
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
                  disabled={!isOwner}
                  className="h-16 rounded-[32px] border-2 border-[#4a6850]/20 shadow-lg font-bold text-gray-900 focus:border-[#4a6850] focus:shadow-xl focus:ring-0 disabled:opacity-70 disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <Label className="text-sm font-black text-[#4a6850]/80 mb-4 block uppercase tracking-wide">Group Icon</Label>
                <div className="flex flex-wrap gap-3 mt-1.5">
                  {EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => {
                        if (isOwner) {
                          setSelectedEmoji(emoji);
                          onUpdateGroup({ emoji });
                        }
                      }}
                      disabled={!isOwner}
                      // Reduced size from w-14 h-14 to w-12 h-12
                      className={`w-12 h-12 rounded-2xl text-2xl flex items-center justify-center transition-all shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 ${selectedEmoji === emoji
                        ? "bg-gradient-to-br from-[#4a6850] to-[#3d5643] text-white scale-110 border-2 border-[#4a6850]"
                        : "bg-white hover:bg-[#4a6850]/5 border border-[#4a6850]/10 hover:border-[#4a6850]/20"
                        } ${!isOwner ? "cursor-not-allowed opacity-70" : ""}`}
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
                <Label className="text-sm font-black text-[#4a6850]/80 uppercase tracking-wide">Members ({Array.isArray(group.members) ? group.members.length : Object.keys(group.members || {}).length})</Label>
                {/* Allow Add Member for everyone? User didn't specify, but implies owner control. Lets keeping Add accessible for now to be safe, or hide it if strict. User said 'Only owner can remove member'. I will keep Add open but Remove restricted. */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopyGroupInvite}
                    className="text-[#4a6850] hover:bg-[#4a6850]/10 font-black rounded-[32px] px-4 py-2 h-10 shadow-sm transition-all hover:scale-105 active:scale-95 border border-[#4a6850]/10"
                    title="Copy group invite link"
                  >
                    <Link className="w-4 h-4 mr-1.5" />
                    Invite Link
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAddMember(true)}
                    className="text-[#4a6850] hover:bg-[#4a6850]/10 font-black rounded-[32px] px-5 py-2 h-10 shadow-sm transition-all hover:scale-105 active:scale-95 border border-[#4a6850]/10"
                  >
                    <UserPlus className="w-4 h-4 mr-1.5" />
                    Add
                  </Button>
                </div>
              </div>

              {/* Add Member Input */}
              {showAddMember && (
                <div className="space-y-4 mb-6 animate-fade-in bg-gradient-to-br from-[#4a6850]/5 to-[#3d5643]/5 rounded-[32px] p-6 border border-[#4a6850]/20 shadow-sm">
                  <div className="flex gap-3">
                    <div className="relative flex-1">
                      <Input
                        placeholder="Username or Name"
                        value={newMemberName}
                        onChange={(e) => {
                          setNewMemberName(e.target.value);
                          if (searchResult || searchError) {
                            setSearchResult(null);
                            setSearchError(false);
                          }
                        }}
                        onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                        className="h-14 rounded-2xl border-[#4a6850]/20 shadow-lg font-bold text-gray-900 placeholder:text-[#4a6850]/40 focus:border-[#4a6850] bg-white focus:ring-0 pr-12"
                        autoFocus
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleSearch}
                        disabled={isSearching || !newMemberName.trim()}
                        className="absolute right-2 top-2 h-10 w-10 text-[#4a6850] hover:bg-[#4a6850]/10 rounded-xl"
                      >
                        {isSearching ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <Search className="w-5 h-5" />
                        )}
                      </Button>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setShowAddMember(false);
                        setNewMemberName("");
                        setSearchResult(null);
                        setSearchError(false);
                      }}
                      className="h-14 w-14 rounded-2xl hover:bg-gray-100 shadow-lg hover:shadow-xl transition-all flex-shrink-0 bg-white"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Search Result */}
                  {searchResult && (
                    <div className="bg-white p-4 rounded-2xl border-2 border-green-100 shadow-lg animate-slide-up">
                      <div className="flex items-center gap-3 mb-4">
                        <Avatar name={searchResult.displayName || searchResult.username} size="md" />
                        <div className="flex-1 min-w-0">
                          <p className="font-black text-gray-900 truncate">{searchResult.displayName || searchResult.username}</p>
                          <p className="text-xs text-gray-500 font-bold">@{searchResult.username}</p>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-green-600 font-black bg-green-50 px-2 py-1 rounded-lg">
                          <CheckCircle2 className="w-3 h-3" />
                          VERIFIED
                        </div>
                      </div>
                      <Button 
                        onClick={() => handleAddMember({ 
                          name: searchResult.displayName || searchResult.username, 
                          userId: searchResult.uid 
                        })} 
                        className="w-full h-12 bg-gradient-to-r from-[#4a6850] to-[#3d5643] hover:from-[#3d5643] hover:to-[#2f4336] text-white font-black rounded-xl shadow-lg transition-all"
                      >
                        Invite to Group
                      </Button>
                    </div>
                  )}

                  {/* Search Error / Not Found */}
                  {searchError && (
                    <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 animate-slide-up">
                      <div className="flex items-center gap-2 text-blue-800 font-bold text-sm mb-2">
                        <AlertTriangle className="w-4 h-4" />
                        User not found
                      </div>
                      <p className="text-[11px] text-blue-700 font-bold mb-4 italic">
                        "@{newMemberName}" is not on Hostel Ledger yet.
                      </p>
                      
                      <div className="space-y-3">
                        <Button 
                          onClick={() => handleAddMember({ name: newMemberName })}
                          variant="outline"
                          className="w-full h-12 border-[#4a6850]/20 text-[#4a6850] font-black rounded-xl bg-white hover:bg-gray-50 flex items-center justify-center gap-2"
                        >
                          <UserPlus className="w-4 h-4" />
                          Add as Temporary Member
                        </Button>

                        <div className="relative">
                          <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-blue-100" />
                          </div>
                          <div className="relative flex justify-center text-[10px] uppercase">
                            <span className="bg-[#f8fafc] px-2 text-blue-400 font-bold">Or Invite by Email</span>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <Input
                            placeholder="friend@email.com"
                            value={inviteEmail}
                            onChange={(e) => setInviteEmail(e.target.value)}
                            className="h-12 rounded-xl border-blue-100 shadow-sm font-bold text-gray-900 placeholder:text-blue-200 focus:border-blue-300 bg-white"
                          />
                          <Button 
                            onClick={() => {
                              if (inviteEmail.trim()) {
                                handleAddMember({ name: newMemberName, email: inviteEmail.trim() });
                                setInviteEmail("");
                              }
                            }}
                            className="h-12 px-6 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl shadow-md"
                            disabled={!inviteEmail.trim()}
                          >
                            Invite
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {!searchResult && !searchError && (
                    <p className="text-[10px] text-[#4a6850]/60 font-black text-center uppercase tracking-widest px-4">
                      Search for friends to sync expenses automatically
                    </p>
                  )}
                </div>
              )}

              {/* Members List */}
              <div className="space-y-3">
                {group.members.map((member) => (
                  <div
                    key={member.id}
                    // Reduced padding from p-5 to p-3
                    className="flex items-center gap-4 p-3 rounded-[32px] bg-white border border-[#4a6850]/10 shadow-lg hover:shadow-xl hover:border-[#4a6850]/20 transition-all hover:scale-[1.01]"
                  >
                    <Avatar name={member.name} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-gray-900 tracking-tight truncate">
                        {member.name}
                        {member.isCurrentUser && (
                          <span className="text-[#4a6850]/80 text-sm ml-2 font-bold">(You)</span>
                        )}
                        {!member.isCurrentUser && !member.userId && (
                          <span className="inline-flex items-center ml-2 px-1.5 py-0.5 rounded-md bg-orange-100 text-orange-600 text-[10px] font-black uppercase tracking-wider">Unclaimed</span>
                        )}
                      </p>
                      {/* Fix NaN logic here too just in case context passes undefined */}
                      {(member.balance !== undefined && member.balance !== 0 && !isNaN(member.balance)) && (
                        <p className={`text-sm font-bold ${member.balance > 0 ? "text-[#4a6850]" : "text-red-600"}`}>
                          {member.balance > 0 ? `Owes Rs ${member.balance.toLocaleString()}` : `Owed Rs ${Math.abs(member.balance).toLocaleString()}`}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      {/* Invite Link for Unclaimed Members */}
                      {!member.isCurrentUser && !member.userId && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleInviteToClaim(member.id, member.name)}
                          className="text-[#4a6850] hover:text-[#3d5643] hover:bg-[#4a6850]/10 w-10 h-10 rounded-2xl transition-all"
                          title="Copy invite link for this profile"
                        >
                          <Share2 className="w-4 h-4" />
                        </Button>
                      )}

                      {/* RESTRICT REMOVE TO OWNER */}
                      {isOwner && !member.isCurrentUser && (
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
                  </div>
                ))}
              </div>
            </div>

            {/* Danger Zone - RESTRICT TO OWNER */}

            {/* Report Group Button */}
            <div className="pt-6 border-t border-[#4a6850]/10 mb-4">
              <Button
                variant="outline"
                className="w-full h-14 rounded-3xl text-red-600 border-red-200 bg-red-50 hover:bg-red-100 font-bold transition-all"
                onClick={() => setIsReportOpen(true)}
              >
                <ShieldAlert className="w-5 h-5 mr-2" />
                Report Group
              </Button>
            </div>
            {isOwner ? (
              <div className="pt-6 border-t border-[#4a6850]/10">
                <Label className="text-red-600 font-black text-sm uppercase tracking-wide">Danger Zone</Label>
                <Button
                  variant="destructive"
                  className="w-full mt-4 h-16 rounded-[32px] bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white font-black shadow-[0_8px_32px_rgba(239,68,68,0.3)] hover:shadow-[0_12px_40px_rgba(239,68,68,0.4)] transition-all hover:scale-[1.02] active:scale-[0.98]"
                  onClick={() => setShowDeleteGroup(true)}
                >
                  <Trash2 className="w-5 h-5 mr-2" />
                  Delete Group
                </Button>
              </div>
            ) : (
              <div className="pt-6 border-t border-[#4a6850]/10">
                <Label className="text-red-600 font-black text-sm uppercase tracking-wide">Danger Zone</Label>
                <Button
                  variant="destructive"
                  className="w-full mt-4 h-16 rounded-[32px] bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white font-black shadow-[0_8px_32px_rgba(239,68,68,0.3)] hover:shadow-[0_12px_40px_rgba(239,68,68,0.4)] transition-all hover:scale-[1.02] active:scale-[0.98]"
                  onClick={() => setShowLeaveGroup(true)}
                >
                  <LogOut className="w-5 h-5 mr-2" />
                  Leave Group
                </Button>
              </div>
            )}
          </div>

          <div className="pt-6 border-t border-[#4a6850]/10 mt-auto bg-white flex-shrink-0">
            <Button
              onClick={onClose}
              variant="secondary"
              className="w-full h-16 rounded-[32px] font-black shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
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
      {/* Leave Group Confirmation */}
      <AlertDialog open={showLeaveGroup} onOpenChange={setShowLeaveGroup}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <LogOut className="w-5 h-5 text-destructive" />
              Leave {group.name}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {hasUnsettledBalance ? (
                <div className="space-y-4">
                  <div className="p-4 bg-red-50 border border-red-200 rounded-2xl">
                    <div className="flex items-center gap-2 text-red-600 font-black text-sm mb-1 uppercase tracking-wide">
                      <AlertTriangle className="w-4 h-4" />
                      Unsettled Balance
                    </div>
                    <p className="text-sm text-red-700 font-bold">
                      You have an unsettled balance of <span className="underline italic">Rs {Math.abs(userBalance).toLocaleString()}</span>. 
                      You must settle all expenses before leaving the group.
                    </p>
                  </div>
                  <p className="text-sm text-gray-500">
                    Reach out to other members to settle up your debts or collect what is owed to you.
                  </p>
                </div>
              ) : (
                "Are you sure you want to leave this group? You will no longer be able to view transactions or participate in the group chat."
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            {!hasUnsettledBalance && (
              <AlertDialogAction
                onClick={() => {
                  onLeaveGroup();
                  setShowLeaveGroup(false);
                }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Leave Group
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ReportSheet
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        targetId={group.id || "unknown"}
        targetType="group"
      />
    </>
  );
};

export default GroupSettingsSheet;