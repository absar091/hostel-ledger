import re

with open("src/pages/GroupDetail.tsx", "r") as f:
    content = f.read()

old_early_returns = """  // Check for pending invitation
  if (group && group.status === 'invited') {
    const invitation = invitations.find(i => i.groupId === group.id);

    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
        <div className="bg-white rounded-3xl p-8 shadow-xl max-w-md w-full text-center border border-gray-100">
          <div className="w-20 h-20 mx-auto bg-blue-50 rounded-full flex items-center justify-center mb-6">
            <span className="text-4xl">{group.emoji || "👋"}</span>
          </div>
          <h2 className="text-2xl font-black mb-2 text-gray-900">You're Invited!</h2>
          <p className="mb-8 text-gray-600">
            You have been invited to join <strong className="text-gray-900">{group.name}</strong>.
            {invitation && (
              <span className="block mt-2 text-sm text-gray-500">
                Invited by {invitation.invitedBy}
              </span>
            )}
          </p>
          <div className="flex gap-4 justify-center w-full">
            <Button
              variant="outline"
              className="flex-1 rounded-xl h-12"
              onClick={async () => {
                if (!invitation) return;
                try {
                  await respondInvitation(invitation.invitationId, false);
                  toast.success("Invitation declined");
                  navigate('/');
                } catch (e) {
                  toast.error("Failed to decline");
                }



              }}
              disabled={!invitation}
            >
              Decline
            </Button>
            <Button
              className="flex-1 rounded-xl h-12 bg-blue-600 hover:bg-blue-700 text-white"
              onClick={async () => {
                if (!invitation) return;
                try {
                  const res = await respondInvitation(invitation.invitationId, true);
                  if (res.success) {
                    toast.success("Welcome to the group! 🎉");
                    // Reload to refresh permissions and state
                    window.location.reload();
                  } else {
                    toast.error(res.error || "Failed to join");
                  }
                } catch (e) {
                  toast.error("Failed to accept");
                }
              }}
              disabled={!invitation}
            >
              Accept Invitation
            </Button>
          </div>
        </div>
      </div>
    );
  }
  if (!group && !isGroupLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center px-6">
          <div className="text-6xl mb-4">🔍</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">{t('group.group_not_found')}</h2>
          <Button onClick={() => navigate("/")} className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white">{t('group.go_back')}</Button>
        </div>
      </div>
    );
  }

  if (isGroupLoading && !partialGroup) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-500">
        <div className="w-16 h-16 border-4 border-emerald-100 border-t-emerald-500 rounded-full animate-spin mb-6"></div>
        <h2 className="text-xl font-bold text-gray-800">{t('group.loading_details')}</h2>
        <p className="text-gray-500 mt-2">{t('group.getting_balances')}</p>
      </div>
    );
  }"""
content = content.replace(old_early_returns, "")


old_groupTotalToReceive = """  // Calculate total amount to receive in this group
  const groupTotalToReceive = Object.values(settlements).reduce((total, settlement) => {
    return total + (settlement.toReceive || 0);
  }, 0);"""
new_groupTotalToReceive = """  // Calculate total amount to receive in this group
  const groupTotalToReceive = useMemo(() => {
    return Object.values(settlements).reduce((total, settlement) => {
      return total + (settlement.toReceive || 0);
    }, 0);
  }, [settlements]);"""
content = content.replace(old_groupTotalToReceive, new_groupTotalToReceive)


old_members = """  const members = group.members.map((m: any) => ({
    id: m.id,
    name: m.name,
    isTemporary: m.isTemporary,
    deletionCondition: m.deletionCondition,
    expiresAt: m.expiresAt,
    email: (m as any).email,
    isPending: (m as any).isPending,
    userId: (m as any).userId,
  }));
  const currentUser = group.members.find((m: any) => m.isCurrentUser);

  // Calculate total pending using settlements
  const totalPending = group.members.reduce((sum: number, m: any) => {
    if (!m.isCurrentUser) {
      const settlement = settlements[m.id];
      // If settlement exists and you owe them (toPay > 0)
      if (settlement && settlement.toPay > 0) {
        return sum + settlement.toPay;
      }
    }
    return sum;
  }, 0);"""
new_members = """  const { members, currentUser, totalPending } = useMemo(() => {
    if (!group) return { members: [], currentUser: null, totalPending: 0 };
    const parsedMembers = group.members.map((m: any) => ({
      id: m.id,
      name: m.name,
      isTemporary: m.isTemporary,
      deletionCondition: m.deletionCondition,
      expiresAt: m.expiresAt,
      email: (m as any).email,
      isPending: (m as any).isPending,
      userId: (m as any).userId,
    }));
    const user = group.members.find((m: any) => m.isCurrentUser);

    const pending = group.members.reduce((sum: number, m: any) => {
      if (!m.isCurrentUser) {
        const settlement = settlements[m.id];
        // If settlement exists and you owe them (toPay > 0)
        if (settlement && settlement.toPay > 0) {
          return sum + settlement.toPay;
        }
      }
      return sum;
    }, 0);
    return { members: parsedMembers, currentUser: user, totalPending: pending };
  }, [group, settlements]);"""
content = content.replace(old_members, new_members)


old_expense_contributions = """  // Find the member who has paid the most in expenses (actual top contributor)
  const memberExpenseContributions = group.members.map((member: { id: any; }) => {
    const totalPaid = transactions
      .filter(t => t.type === "expense" && t.paidBy === member.id)
      .reduce((sum, t) => sum + t.amount, 0);
    return {
      ...member,
      totalPaid
    };
  });

  const topSpender = memberExpenseContributions.length > 0
    ? memberExpenseContributions.reduce((prev: { totalPaid: number; }, curr: { totalPaid: number; }) => {
      return curr.totalPaid > prev.totalPaid ? curr : prev;
    })
    : null;"""
new_expense_contributions = """  // Find the member who has paid the most in expenses (actual top contributor)
  const { memberExpenseContributions, topSpender } = useMemo(() => {
    if (!group) return { memberExpenseContributions: [], topSpender: null };
    const contributions = group.members.map((member: { id: any; }) => {
      const totalPaid = transactions
        .filter(t => t.type === "expense" && t.paidBy === member.id)
        .reduce((sum, t) => sum + t.amount, 0);
      return {
        ...member,
        totalPaid
      };
    });

    const spender = contributions.length > 0
      ? contributions.reduce((prev: { totalPaid: number; }, curr: { totalPaid: number; }) => {
        return curr.totalPaid > prev.totalPaid ? curr : prev;
      })
      : null;

    return { memberExpenseContributions: contributions, topSpender: spender };
  }, [group, transactions]);"""
content = content.replace(old_expense_contributions, new_expense_contributions)


# Move the early returns before the return
insert_point = """  return (
    <div className="min-h-screen bg-white pb-24">"""
content = content.replace(insert_point, old_early_returns + "\n\n" + insert_point)

with open("src/pages/GroupDetail.tsx", "w") as f:
    f.write(content)
