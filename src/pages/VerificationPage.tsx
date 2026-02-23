import { useState } from "react";
import AddMoneySheet from "@/components/AddMoneySheet";
import GroupSettingsSheet from "@/components/GroupSettingsSheet";
import { Button } from "@/components/ui/button";

const VerificationPage = () => {
  const [showAddMoney, setShowAddMoney] = useState(false);
  const [showGroupSettings, setShowGroupSettings] = useState(false);

  // Mock group data
  const mockGroup = {
    id: "1",
    name: "Test Group",
    emoji: "🏠",
    members: [
      { id: "1", name: "Alice", isCurrentUser: true, balance: 100 },
      { id: "2", name: "Bob", balance: -50 },
      { id: "3", name: "Charlie", balance: 0 },
    ]
  };

  return (
    <div className="p-10 space-y-10">
        <h1 className="text-2xl font-bold">Verification Page</h1>
        <div className="flex gap-4">
            <Button onClick={() => setShowAddMoney(true)}>Open Add Money</Button>
            <Button onClick={() => setShowGroupSettings(true)}>Open Group Settings</Button>
        </div>

        <AddMoneySheet
            open={showAddMoney}
            onClose={() => setShowAddMoney(false)}
            onSubmit={async () => {}}
        />

        <GroupSettingsSheet
            open={showGroupSettings}
            onClose={() => setShowGroupSettings(false)}
            group={mockGroup}
            onAddMember={() => {}}
            onRemoveMember={() => {}}
            onUpdateGroup={() => {}}
            onDeleteGroup={() => {}}
            isOwner={true}
        />
    </div>
  );
};

export default VerificationPage;
