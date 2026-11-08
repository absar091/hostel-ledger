import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Avatar from "./Avatar";
import { UserPlus, Trash2, AlertTriangle, X, ShieldAlert, Copy, Link, LogOut, Search, Loader2, CheckCircle2 } from "lucide-react";
import { getValidUserDetails } from "@/lib/api";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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
  const { t } = useTranslation();
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
        <SheetContent side="bottom" className="h-[90vh] rounded-t-[32px] flex flex-col bg-white border-t border-[#4a6850]/10 z-[100] px-0">
          <div className="mx-auto w-12 h-1.5 bg-gray-200/80 rounded-full mt-4 flex-shrink-0" />
          
          <SheetHeader className="px-6 pt-6 pb-2 text-left space-y-1">
            <div className="flex items-center justify-between">
              <div>
                <SheetTitle className="text-2xl font-black text-[#4a6850] tracking-tight">
                  Group Settings
                </SheetTitle>
                <SheetDescription className="text-[11px] font-bold text-[#4a6850]/40 uppercase tracking-widest">
                  {group.name} • {Array.isArray(group.members) ? group.members.length : 0} Members
                </SheetDescription>
              </div>
              <div className="w-10 h-10 bg-[#4a6850]/5 rounded-2xl flex items-center justify-center text-xl shadow-inner border border-[#4a6850]/10">
                {selectedEmoji}
              </div>
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto space-y-6 pb-4">
            <div className="space-y-4 px-4">
              <div className="bg-[#4a6850]/5 rounded-3xl p-4 border border-[#4a6850]/10 shadow-sm">
                <div className="flex gap-3">
                  <div className="flex-1">
                    <Label htmlFor="groupName" className="text-[10px] font-black text-[#4a6850]/40 mb-1.5 block uppercase tracking-widest pl-1">Group Name</Label>
                    <div className="relative">
                      <Input
                        id="groupName"
                        value={groupName}
                        onChange={(e) => setGroupName(e.target.value)}
                        onBlur={handleUpdateGroup}
                        disabled={!isOwner}
                        className="h-11 rounded-2xl border-none bg-white shadow-sm font-bold text-gray-900 focus:ring-2 focus:ring-[#4a6850]/10 transition-all disabled:opacity-70 disabled:cursor-not-allowed px-4"
                      />
                      {!isOwner && (
                        <ShieldAlert className="absolute right-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#4a6850]/20" />
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-[#4a6850]/5">
                  <Label className="text-[10px] font-black text-[#4a6850]/40 mb-2.5 block uppercase tracking-widest pl-1">Theme Icon</Label>
                  <div className="grid grid-cols-5 gap-3">
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
                        aria-label={`Select icon ${emoji}`}
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl transition-all active:scale-95 ${
                          selectedEmoji === emoji
                            ? "bg-[#4a6850] text-white shadow-lg shadow-[#4a6850]/20 scale-105"
                            : "bg-white border border-[#4a6850]/10 hover:border-[#4a6850]/30"
                          } ${!isOwner ? "cursor-not-allowed opacity-50" : ""}`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="px-4">
              <div className="flex items-center justify-between mb-3 pl-1">
                <div className="flex flex-col">
                  <Label className="text-[10px] font-black text-[#4a6850]/40 uppercase tracking-widest">Members</Label>
                  <p className="text-[10px] font-bold text-[#4a6850]/30">{Array.isArray(group.members) ? group.members.length : 0} People in Group</p>
                </div>
                <div className="flex items-center gap-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={t('group.copy_invite', 'Copy Group Invite Link')}
                        onClick={handleCopyGroupInvite}
                        className="w-10 h-10 text-[#4a6850] bg-[#4a6850]/5 hover:bg-[#4a6850]/10 rounded-2xl transition-all active:scale-90"
                      >
                        <Link className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{t('group.copy_invite', 'Copy Group Invite Link')}</p>
                    </TooltipContent>
                  </Tooltip>
                  <Button
                    onClick={() => setShowAddMember(true)}
                    className="h-10 px-4 bg-[#4a6850] hover:bg-[#3d5643] text-white font-black rounded-2xl shadow-sm transition-all active:scale-95 flex items-center gap-2 text-[11px] uppercase tracking-wider"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    Add
                  </Button>
                </div>
              </div>

              {/* Add Member Input - Compacted */}
              {showAddMember && (
                <div className="space-y-3 mb-6 animate-fade-in bg-gradient-to-br from-[#4a6850]/5 to-[#3d5643]/5 rounded-3xl p-4 border border-[#4a6850]/20 shadow-sm">
                  <div className="flex gap-2">
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
                        className="h-11 rounded-xl border-[#4a6850]/10 shadow-sm font-bold text-gray-900 placeholder:text-[#4a6850]/30 focus:border-[#4a6850]/40 bg-white focus:ring-0 pr-10"
                        autoFocus
                      />
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={t('group.search_member', 'Search member')}
                            onClick={handleSearch}
                            disabled={isSearching || !newMemberName.trim()}
                            className="absolute right-1 top-1 h-9 w-9 text-[#4a6850] hover:bg-[#4a6850]/10 rounded-lg"
                          >
                            {isSearching ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Search className="w-4 h-4" />
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{t('group.search_member', 'Search member')}</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={t('group.close_add_member', 'Close add member')}
                          onClick={() => {
                            setShowAddMember(false);
                            setNewMemberName("");
                            setSearchResult(null);
                            setSearchError(false);
                          }}
                          className="h-11 w-11 rounded-xl hover:bg-gray-100 shadow-sm hover:shadow-md transition-all flex-shrink-0 bg-white"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{t('group.close_add_member', 'Close add member')}</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>

                  {/* Search Result */}
                  {searchResult && (
                    <div className="bg-white p-3 rounded-2xl border border-green-100 shadow-sm animate-slide-up">
                      <div className="flex items-center gap-3 mb-3">
                        <Avatar name={searchResult.displayName || searchResult.username} size="sm" />
                        <div className="flex-1 min-w-0">
                          <p className="font-black text-gray-900 text-sm truncate">{searchResult.displayName || searchResult.username}</p>
                          <p className="text-[10px] text-gray-500 font-bold">@{searchResult.username}</p>
                        </div>
                        <div className="flex items-center gap-1 text-[9px] text-green-600 font-black bg-green-50 px-2 py-0.5 rounded-lg">
                          <CheckCircle2 className="w-3 h-3" />
                          VERIFIED
                        </div>
                      </div>
                      <Button 
                        onClick={() => handleAddMember({ 
                          name: searchResult.displayName || searchResult.username, 
                          userId: searchResult.uid 
                        })} 
                        className="w-full h-10 bg-gradient-to-r from-[#4a6850] to-[#3d5643] hover:from-[#3d5643] hover:to-[#2f4336] text-white font-black rounded-xl text-[11px] tracking-wider uppercase"
                      >
                        Invite to Group
                      </Button>
                    </div>
                  )}

                  {/* Search Error / Not Found */}
                  {searchError && (
                    <div className="bg-blue-50/50 p-3 rounded-2xl border border-blue-100 animate-slide-up">
                      <div className="flex items-center gap-2 text-blue-800 font-bold text-xs mb-1.5">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        User not found
                      </div>
                      <p className="text-[10px] text-blue-700 font-bold mb-3 italic">
                        "@{newMemberName}" is not on Hostel Ledger yet.
                      </p>
                      
                      <div className="space-y-2">
                        <Button 
                          onClick={() => handleAddMember({ name: newMemberName })}
                          variant="outline"
                          className="w-full h-10 border-[#4a6850]/10 text-[#4a6850] font-black rounded-xl bg-white hover:bg-gray-50 flex items-center justify-center gap-2 text-[11px]"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          Add Temporary
                        </Button>

                        <div className="relative">
                          <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-blue-50" />
                          </div>
                          <div className="relative flex justify-center text-[9px] uppercase">
                            <span className="bg-transparent px-2 text-blue-300 font-bold">Or Invite Email</span>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <Input
                            placeholder="friend@email.com"
                            value={inviteEmail}
                            onChange={(e) => setInviteEmail(e.target.value)}
                            className="h-10 rounded-xl border-blue-50 shadow-sm font-bold text-gray-900 placeholder:text-blue-200 focus:border-blue-200 bg-white text-xs"
                          />
                          <Button 
                            onClick={() => {
                              if (inviteEmail.trim()) {
                                handleAddMember({ name: newMemberName, email: inviteEmail.trim() });
                                setInviteEmail("");
                              }
                            }}
                            className="h-10 px-4 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl text-[11px]"
                            disabled={!inviteEmail.trim()}
                          >
                            Invite
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {!searchResult && !searchError && (
                    <p className="text-[9px] text-[#4a6850]/50 font-black text-center uppercase tracking-widest">
                      Sync expenses automatically
                    </p>
                  )}
                </div>
              )}

              {/* Simple Members List */}
              <div className="space-y-2">
                {group.members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center gap-4 p-3 px-4 rounded-2xl bg-white border border-[#4a6850]/10 shadow-sm"
                  >
                    <Avatar name={member.name} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-gray-900 text-sm tracking-tight truncate">
                        {member.name}
                        {member.isCurrentUser && (
                          <span className="text-[#4a6850]/40 text-[10px] ml-1 font-bold">(You)</span>
                        )}
                      </p>
                      {(member.balance !== undefined && member.balance !== 0 && !isNaN(member.balance)) && (
                        <p className={`text-[10px] font-black uppercase tracking-tight ${member.balance > 0 ? "text-[#4a6850]" : "text-red-500"}`}>
                          {member.balance > 0 ? `Owes Rs ${member.balance.toLocaleString()}` : `Owed Rs ${Math.abs(member.balance).toLocaleString()}`}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      {!member.isCurrentUser && !member.userId && (
                        <button
                          onClick={() => handleInviteToClaim(member.id, member.name)}
                          aria-label={`Invite ${member.name} to claim account`}
                          className="w-10 h-10 flex items-center justify-center text-[#4a6850]/40 hover:text-[#4a6850] active:scale-90 transition-all rounded-xl hover:bg-[#4a6850]/5"
                        >
                          <Share2 className="w-4 h-4" />
                        </button>
                      )}
                      {isOwner && !member.isCurrentUser && (
                        <button
                          onClick={() => setMemberToRemove(member)}
                          aria-label={`Remove ${member.name} from group`}
                          className="w-10 h-10 flex items-center justify-center text-red-300 hover:text-red-500 active:scale-90 transition-all rounded-xl hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Compact Danger Zone */}
            <div className="px-4 space-y-3">
              <div className="bg-red-50/30 rounded-3xl p-4 border border-red-100/50">
                <Label className="text-[10px] font-black text-red-300 uppercase tracking-widest pl-1 mb-3 block">Management</Label>
                
                <div className="flex flex-col gap-2">
                  <Button
                    variant="ghost"
                    className="h-10 rounded-2xl text-red-500 bg-white border border-red-100 font-black text-[11px] uppercase tracking-wider flex items-center justify-center gap-2 group"
                    onClick={() => setIsReportOpen(true)}
                  >
                    <ShieldAlert className="w-3.5 h-3.5" />
                    Report Group
                  </Button>

                  {isOwner ? (
                    <Button
                      variant="destructive"
                      className="h-10 rounded-2xl bg-gradient-to-r from-red-600 to-red-500 text-white font-black text-[11px] uppercase tracking-wider shadow-sm active:scale-95"
                      onClick={() => setShowDeleteGroup(true)}
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-2" />
                      Delete Group
                    </Button>
                  ) : (
                    <Button
                      variant="destructive"
                      className="h-10 rounded-2xl bg-gradient-to-r from-red-600 to-red-500 text-white font-black text-[11px] uppercase tracking-wider shadow-sm active:scale-95"
                      onClick={() => setShowLeaveGroup(true)}
                    >
                      <LogOut className="w-3.5 h-3.5 mr-2" />
                      Leave Group
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 mt-auto bg-white flex-shrink-0 px-6 pb-8">
            <Button
              onClick={onClose}
              className="w-full h-12 rounded-[20px] bg-gradient-to-r from-[#4a6850] to-[#3d5643] hover:from-[#3d5643] hover:to-[#2f4336] text-white font-black uppercase tracking-widest shadow-lg shadow-[#4a6850]/20 transition-all active:scale-95"
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