import { useState } from "react";
import AddMoneySheet from "@/components/AddMoneySheet";
import GroupSettingsSheet from "@/components/GroupSettingsSheet";
import TransactionDetailModal from "@/components/TransactionDetailModal";
import OnboardingTour from "@/components/OnboardingTour";
import { Button } from "@/components/ui/button";

const VerificationPage = () => {
  const [showAddMoney, setShowAddMoney] = useState(false);
  const [showGroupSettings, setShowGroupSettings] = useState(false);
  const [showTransactionDetail, setShowTransactionDetail] = useState(false);
  const [showOnboardingTour, setShowOnboardingTour] = useState(false);

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
    <div className="p-10 space-y-10">
        <h1 className="text-2xl font-bold">Verification Page</h1>
        <div className="flex gap-4 flex-wrap">
            <Button onClick={() => setShowAddMoney(true)}>Open Add Money</Button>
            <Button onClick={() => setShowGroupSettings(true)}>Open Group Settings</Button>
            <Button onClick={() => setShowTransactionDetail(true)}>Open Transaction Detail</Button>
            <Button id="btn-onboarding-tour" onClick={() => setShowOnboardingTour(true)}>Open Onboarding Tour</Button>
        </div>

        <OnboardingTour
          open={showOnboardingTour}
          onClose={() => setShowOnboardingTour(false)}
          steps={[
            {
              id: '1',
              title: 'Welcome!',
              description: 'This is a test tour.',
              emoji: '👋'
            }
          ]}
        />

        <AddMoneySheet
            open={showAddMoney}
            onClose={() => setShowAddMoney(false)}
            onSubmit={async () => {}}
            onAddMember={async () => ({ success: true })}
            initialGroupId="group1"
        />
        <Button onClick={() => setShowAddExpense(true)}>Open Add Expense</Button>
    </div>
  );
};

export default VerificationPage;
