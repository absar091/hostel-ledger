import { useState } from "react";
import AddExpenseSheet from "@/components/AddExpenseSheet";
import { Button } from "@/components/ui/button";
import TransactionDetailModal from "@/components/TransactionDetailModal";

const VerificationPage = () => {
  const [showAddExpense, setShowAddExpense] = useState(true);
  const [showTransactionDetail, setShowTransactionDetail] = useState(true);

  // Mock group data
  const mockGroups = [
      {
          id: "group1",
          name: "Hostel Ledger",
          emoji: "🏢",
          members: [
              { id: "me", name: "You", isCurrentUser: true },
              { id: "user2", name: "Absar Ahmad" },
              { id: "user3", name: "Ali" }
          ],
          createdBy: "me"
      }
  ];

  // Mock transaction data
  const mockTransaction = {
      id: "txn_1234567890",
      groupId: "group1",
      type: "expense",
      title: "Grocery Shopping",
      amount: 45.50,
      paidBy: "user2",
      paidByName: "Absar Ahmad",
      date: new Date().toISOString(),
      location: { lat: 37.7749, lng: -122.4194 }
  };

  const mockUser = { uid: "me", name: "You" };

  return (
    <div className="p-10 space-y-10 min-h-screen bg-gray-100 flex items-center justify-center">
        {/* <AddExpenseSheet
            open={showAddExpense}
            onClose={() => setShowAddExpense(false)}
            groups={mockGroups}
            onSubmit={async () => {}}
            onAddMember={async () => ({ success: true })}
            initialGroupId="group1"
        />
        <Button onClick={() => setShowAddExpense(true)}>Open Add Expense</Button> */}

        {showTransactionDetail && (
            <TransactionDetailModal
                transaction={mockTransaction}
                onClose={() => setShowTransactionDetail(false)}
                groups={mockGroups}
                user={mockUser}
            />
        )}
        <Button onClick={() => setShowTransactionDetail(true)}>Open Transaction Detail</Button>
    </div>
  );
};

export default VerificationPage;
