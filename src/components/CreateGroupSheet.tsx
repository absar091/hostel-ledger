import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Plus, Users } from "lucide-react";
import Avatar from "./Avatar";
import { cn } from "@/lib/utils";

const EMOJI_OPTIONS = [
  "🏠", "🍽️", "✈️", "🎉", "🛒", "☕", "🎬", "🏋️", 
  "🎮", "📚", "🚗", "🏖️", "🎂", "💼", "🎸", "⚽"
];

interface CreateGroupSheetProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    emoji: string;
    members: string[];
  }) => void;
}

const CreateGroupSheet = ({ open, onClose, onSubmit }: CreateGroupSheetProps) => {
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("🏠");
  const [memberName, setMemberName] = useState("");
  const [members, setMembers] = useState<string[]>([]);

  const handleClose = () => {
    setName("");
    setEmoji("🏠");
    setMemberName("");
    setMembers([]);
    onClose();
  };

  const handleAddMember = () => {
    if (memberName.trim() && !members.includes(memberName.trim())) {
      setMembers([...members, memberName.trim()]);
      setMemberName("");
    }
  };

  const handleRemoveMember = (member: string) => {
    setMembers(members.filter((m) => m !== member));
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
      members: ["You", ...members],
    });
    handleClose();
  };

  const canSubmit = name.trim().length > 0;

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl flex flex-col">
        <SheetHeader className="flex-shrink-0 mb-4">
          <SheetTitle className="text-center">Create New Group</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto space-y-6 pb-4">
          {/* Group Preview */}
          <div className="flex items-center justify-center animate-fade-in">
            <div className="w-20 h-20 rounded-2xl bg-secondary flex items-center justify-center text-4xl shadow-card">
              {emoji}
            </div>
          </div>

          {/* Group Name */}
          <div className="animate-fade-in" style={{ animationDelay: "0.05s" }}>
            <label className="text-sm font-medium text-muted-foreground mb-3 block">
              Group Name
            </label>
            <Input
              placeholder="e.g., Roommates, Trip Friends"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-12 text-lg"
              autoFocus
            />
          </div>

          {/* Emoji Picker */}
          <div className="animate-fade-in" style={{ animationDelay: "0.1s" }}>
            <label className="text-sm font-medium text-muted-foreground mb-3 block">
              Choose an Icon
            </label>
            <div className="grid grid-cols-8 gap-2">
              {EMOJI_OPTIONS.map((e) => (
                <button
                  key={e}
                  onClick={() => setEmoji(e)}
                  className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center text-xl transition-all",
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

          {/* Add Members */}
          <div className="animate-fade-in" style={{ animationDelay: "0.15s" }}>
            <label className="text-sm font-medium text-muted-foreground mb-3 block">
              Add Members
            </label>
            <div className="flex gap-2">
              <Input
                placeholder="Enter member name"
                value={memberName}
                onChange={(e) => setMemberName(e.target.value)}
                onKeyPress={handleKeyPress}
                className="h-12 flex-1"
              />
              <Button
                onClick={handleAddMember}
                disabled={!memberName.trim()}
                size="icon"
                className="h-12 w-12"
              >
                <Plus className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Members List */}
          <div className="space-y-2 animate-fade-in" style={{ animationDelay: "0.2s" }}>
            {/* You (always included) */}
            <div className="flex items-center gap-3 p-3 bg-primary/5 border border-primary/20 rounded-xl">
              <Avatar name="You" size="sm" />
              <span className="font-medium flex-1">You</span>
              <span className="text-xs text-primary font-medium">Creator</span>
            </div>

            {/* Added members */}
            {members.map((member) => (
              <div
                key={member}
                className="flex items-center gap-3 p-3 bg-secondary rounded-xl"
              >
                <Avatar name={member} size="sm" />
                <span className="font-medium flex-1">{member}</span>
                <button
                  onClick={() => handleRemoveMember(member)}
                  className="w-6 h-6 rounded-full bg-destructive/10 flex items-center justify-center hover:bg-destructive/20 transition-colors"
                >
                  <X className="w-3 h-3 text-destructive" />
                </button>
              </div>
            ))}

            {members.length === 0 && (
              <div className="text-center py-6 text-muted-foreground">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
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
