import re

with open('src/pages/Dashboard.tsx', 'r') as f:
    content = f.read()

# Replace useFirebaseAuth hook
mock_auth = """
  // MOCKED HOOKS
  const user = {
    uid: "test-user",
    name: "Ali",
    email: "ali@example.com",
    walletBalance: 1202185.84,
    settlements: {},
  };
  const getWalletBalance = () => 1202185.84;
  const getTotalToReceive = () => 15015704;
  const getTotalToPay = () => 3196.66;
  const getSettlementDelta = () => 15012508.09;
"""

content = re.sub(r'const\s+\{\s+user,[\s\S]+?\} = useFirebaseAuth\(\);', mock_auth, content)

# Replace useFirebaseData hook
mock_data = """
  const groups = Array(42).fill({ id: "g1", name: "Test Group", members: [], emoji: "👥" });
  const createGroup = async () => ({ success: true });
  const addExpense = async () => ({ success: true });
  const recordPayment = async () => ({ success: true });
  const addMoneyToWallet = async () => ({ success: true });
  const payMyDebt = async () => ({ success: true });
  const getAllTransactions = () => [];
  const addMemberToGroup = async () => ({ success: true });
"""

content = re.sub(r'const\s+\{\s+groups,[\s\S]+?\} = useFirebaseData\(\);', mock_data, content)

# Replace pendingPaymentCounts
mock_counts = """
  const pendingPaymentCounts = {
      total: 25,
      toPayCount: 8,
      toReceiveCount: 17,
  };
"""

content = re.sub(r'const pendingPaymentCounts = useMemo\(\(\) => \{[\s\S]+?\}, \[user\?.settlements\]\);', mock_counts, content)

# Fix TypeScript errors if any (e.g. user type)
content = content.replace("user?.uid", '"test-user"')
content = content.replace("user?.settlements", "{}")

with open('src/pages/DashboardVerified.tsx', 'w') as f:
    f.write(content)
