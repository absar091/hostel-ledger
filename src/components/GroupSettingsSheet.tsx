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
        <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl flex flex-col">
          <SheetHeader className="flex-shrink-0 mb-6">
            <SheetTitle className="text-center">Group Settings</SheetTitle>
            <SheetDescription className="text-center text-sm text-gray-500">
              Manage group details, members, and preferences
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto space-y-6 pb-4">
            {/* Group Name & Emoji */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="groupName">Group Name</Label>
                <Input
                  id="groupName"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  onBlur={handleUpdateGroup}
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label>Group Icon</Label>
                <div className="flex flex-wrap gap-2 mt-1.5">
                  {EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => {
                        setSelectedEmoji(emoji);
                        onUpdateGroup({ emoji });
                      }}
                      className={`w-12 h-12 rounded-xl text-2xl flex items-center justify-center transition-all ${
                        selectedEmoji === emoji
                          ? "bg-primary text-primary-foreground scale-110"
                          : "bg-secondary hover:bg-secondary/80"
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
              <div className="flex items-center justify-between mb-3">
                <Label>Members ({group.members.length})</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAddMember(true)}
                  className="text-primary"
                >
                  <UserPlus className="w-4 h-4 mr-1" />
                  Add
                </Button>
              </div>

              {/* Add Member Input */}
              {showAddMember && (
                <div className="flex gap-2 mb-4 animate-fade-in">
                  <Input
                    placeholder="Member name"
                    value={newMemberName}
                    onChange={(e) => setNewMemberName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddMember()}
                    autoFocus
                  />
                  <Button onClick={handleAddMember} disabled={!newMemberName.trim()}>
                    Add
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setShowAddMember(false);
                      setNewMemberName("");
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}

              {/* Members List */}
              <div className="space-y-2">
                {group.members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center gap-3 p-3 rounded-xl bg-secondary"
                  >
                    <Avatar name={member.name} size="sm" />
                    <div className="flex-1">
                      <p className="font-medium text-foreground">
                        {member.name}
                        {member.isCurrentUser && (
                          <span className="text-muted-foreground text-sm ml-1">(You)</span>
                        )}
                      </p>
                      {member.balance !== 0 && (
                        <p className={`text-xs ${member.balance > 0 ? "text-positive" : "text-negative"}`}>
                          {member.balance > 0 ? `Owes Rs ${member.balance}` : `Owed Rs ${Math.abs(member.balance)}`}
                        </p>
                      )}
                    </div>
                    {!member.isCurrentUser && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setMemberToRemove(member)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Danger Zone */}
            <div className="pt-4 border-t border-border">
              <Label className="text-destructive">Danger Zone</Label>
              <Button
                variant="destructive"
                className="w-full mt-3"
                onClick={() => setShowDeleteGroup(true)}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Group
              </Button>
            </div>
          </div>

          <div className="pt-4 border-t mt-auto">
            <Button onClick={onClose} variant="secondary" className="w-full h-12">
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