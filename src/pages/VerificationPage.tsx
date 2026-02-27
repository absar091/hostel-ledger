import { useState } from "react";
import AddMoneySheet from "@/components/AddMoneySheet";
import GroupSettingsSheet from "@/components/GroupSettingsSheet";
import TransactionDetailModal from "@/components/TransactionDetailModal";
import { Button } from "@/components/ui/button";

const VerificationPage = () => {
  const [showAddMoney, setShowAddMoney] = useState(false);
  const [showGroupSettings, setShowGroupSettings] = useState(false);
  const [showTransactionDetail, setShowTransactionDetail] = useState(false);

  // Mock group data
  const mockGroup = {
    id: "group1",
    name: "Test Group",
    emoji: "🏠",
    members: [
      { id: "user1", name: "Alice", isCurrentUser: true, balance: 100 },
      { id: "user2", name: "Bob", balance: -50 },
      { id: "user3", name: "Charlie", balance: 0 },
    ],
    createdBy: "user1"
  };

  // Mock transaction data
  const mockTransaction = {
    id: "txn_1234567890",
    type: "expense",
    title: "Grocery Shopping",
    amount: 1500,
    date: "Oct 24, 2023",
    paidBy: "user1",
    paidByName: "Alice",
    groupId: "group1",
    participants: [
        { id: "user1", name: "Alice", amount: 500 },
        { id: "user2", name: "Bob", amount: 500 },
        { id: "user3", name: "Charlie", amount: 500 }
    ],
    note: "Weekly groceries including fruits and vegetables",
    place: "Supermarket"
  };

  const mockUser = {
      uid: "user1",
      name: "Alice"
  };

  return (
    <div className="p-10 space-y-10">
        <h1 className="text-2xl font-bold">Verification Page</h1>
        <div className="flex gap-4 flex-wrap">
            <Button onClick={() => setShowAddMoney(true)}>Open Add Money</Button>
            <Button onClick={() => setShowGroupSettings(true)}>Open Group Settings</Button>
            <Button onClick={() => setShowTransactionDetail(true)}>Open Transaction Detail</Button>
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

        {showTransactionDetail && (
            <TransactionDetailModal
                transaction={mockTransaction}
                onClose={() => setShowTransactionDetail(false)}
                groups={[mockGroup]}
                user={mockUser}
            />
        )}
    </div>
  );
};

export default VerificationPage;
