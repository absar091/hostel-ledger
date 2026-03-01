import { useState } from "react";
import AddExpenseSheet from "@/components/AddExpenseSheet";
import { Button } from "@/components/ui/button";

const VerificationPage = () => {
  const [showAddExpense, setShowAddExpense] = useState(true);

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

  return (
    <div className="p-10 space-y-10 min-h-screen bg-gray-100 flex items-center justify-center">
        <AddExpenseSheet
            open={showAddExpense}
            onClose={() => setShowAddExpense(false)}
            groups={mockGroups}
            onSubmit={async () => {}}
            onAddMember={async () => ({ success: true })}
            initialGroupId="group1"
        />
        <Button onClick={() => setShowAddExpense(true)}>Open Add Expense</Button>
    </div>
  );
};

export default VerificationPage;
