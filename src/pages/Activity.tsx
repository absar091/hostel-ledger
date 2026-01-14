import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { 
  ArrowUpRight, 
  ArrowDownLeft, 
  CreditCard, 
  Search,
  Calendar,
  Activity as ActivityIcon
} from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { Input } from "@/components/ui/input";
import { useFirebaseData } from "@/contexts/FirebaseDataContext";
import { useFirebaseAuth } from "@/contexts/FirebaseAuthContext";

const Activity = () => {
  const navigate = useNavigate();
  const { getAllTransactions, groups } = useFirebaseData();
  
  const [activeTab, setActiveTab] = useState<"home" | "groups" | "add" | "activity" | "profile">("activity");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "expense" | "payment" | "wallet">("all");
  const [filterDate, setFilterDate] = useState<"all" | "today" | "week" | "month">("all");

  const allTransactions = getAllTransactions();

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    let filtered = allTransactions;

    // Filter by type
    if (filterType !== "all") {
      if (filterType === "wallet") {
        filtered = filtered.filter(t => t.type === "wallet_add" || t.type === "wallet_deduct");
      } else {
        filtered = filtered.filter(t => t.type === filterType);
      }
    }

    // Filter by date
    if (filterDate !== "all") {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      filtered = filtered.filter(t => {
        const transactionDate = new Date(t.createdAt);
        
        if (filterDate === "today") {
          return transactionDate >= today;
        } else if (filterDate === "week") {
          const weekAgo = new Date(today);
          weekAgo.setDate(weekAgo.getDate() - 7);
          return transactionDate >= weekAgo;
        } else if (filterDate === "month") {
          const monthAgo = new Date(today);
          monthAgo.setMonth(monthAgo.getMonth() - 1);
          return transactionDate >= monthAgo;
        }
        return true;
      });
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(t => 
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.note?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.place?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return filtered;
  }, [allTransactions, filterType, filterDate, searchQuery]);

  // Calculate statistics
  const stats = useMemo(() => {
    const expenses = filteredTransactions.filter(t => t.type === "expense");
    const payments = filteredTransactions.filter(t => t.type === "payment");
    const walletAdds = filteredTransactions.filter(t => t.type === "wallet_add");
    
    const totalSpent = expenses.reduce((sum, t) => sum + t.amount, 0);
    const totalReceived = payments.reduce((sum, t) => sum + t.amount, 0);
    const totalAdded = walletAdds.reduce((sum, t) => sum + t.amount, 0);

    return {
      totalTransactions: filteredTransactions.length,
      totalSpent,
      totalReceived,
      totalAdded,
      expenseCount: expenses.length,
      paymentCount: payments.length,
    };
  }, [filteredTransactions]);

  const handleTabChange = (tab: typeof activeTab) => {
    if (tab === "home") {
      navigate("/");
    } else if (tab === "groups") {
      navigate("/groups");
    } else if (tab === "profile") {
      navigate("/profile");
    } else if (tab === "activity") {
      navigate("/activity");
    } else {
      setActiveTab(tab);
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "expense":
        return <ArrowUpRight className="w-5 h-5" />;
      case "payment":
        return <ArrowDownLeft className="w-5 h-5" />;
      default:
        return <CreditCard className="w-5 h-5" />;
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case "expense":
        return "bg-red-50 border-red-100 text-red-500";
      case "payment":
        return "bg-emerald-50 border-emerald-100 text-emerald-500";
      default:
        return "bg-blue-50 border-blue-100 text-blue-500";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-green-50 pb-24">
      {/* Header */}
      <div className="px-6 pt-12 pb-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl flex items-center justify-center">
            <ActivityIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Activity Center</h1>
            <p className="text-sm text-gray-500">Track all your transactions</p>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-white/70 backdrop-blur-lg rounded-2xl p-4 border border-white/40">
            <div className="text-sm text-gray-500 mb-1">Total Transactions</div>
            <div className="text-2xl font-bold text-gray-900">{stats.totalTransactions}</div>
          </div>
          
          <div className="bg-white/70 backdrop-blur-lg rounded-2xl p-4 border border-white/40">
            <div className="text-sm text-gray-500 mb-1">Total Spent</div>
            <div className="text-2xl font-bold text-red-600">Rs {stats.totalSpent.toLocaleString()}</div>
          </div>
          
          <div className="bg-white/70 backdrop-blur-lg rounded-2xl p-4 border border-white/40">
            <div className="text-sm text-gray-500 mb-1">Total Received</div>
            <div className="text-2xl font-bold text-emerald-600">Rs {stats.totalReceived.toLocaleString()}</div>
          </div>
          
          <div className="bg-white/70 backdrop-blur-lg rounded-2xl p-4 border border-white/40">
            <div className="text-sm text-gray-500 mb-1">Money Added</div>
            <div className="text-2xl font-bold text-blue-600">Rs {stats.totalAdded.toLocaleString()}</div>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            placeholder="Search transactions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 h-12 bg-white/70 backdrop-blur-lg border-white/40"
          />
        </div>

        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {/* Type Filter */}
          <button
            onClick={() => setFilterType("all")}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
              filterType === "all"
                ? "bg-emerald-500 text-white"
                : "bg-white/70 text-gray-600 hover:bg-white"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilterType("expense")}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
              filterType === "expense"
                ? "bg-red-500 text-white"
                : "bg-white/70 text-gray-600 hover:bg-white"
            }`}
          >
            Expenses ({stats.expenseCount})
          </button>
          <button
            onClick={() => setFilterType("payment")}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
              filterType === "payment"
                ? "bg-emerald-500 text-white"
                : "bg-white/70 text-gray-600 hover:bg-white"
            }`}
          >
            Payments ({stats.paymentCount})
          </button>
          <button
            onClick={() => setFilterType("wallet")}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
              filterType === "wallet"
                ? "bg-blue-500 text-white"
                : "bg-white/70 text-gray-600 hover:bg-white"
            }`}
          >
            Wallet
          </button>
        </div>

        {/* Date Filter */}
        <div className="flex gap-2 mt-3 overflow-x-auto pb-2 scrollbar-hide">
          <Calendar className="w-5 h-5 text-gray-400 flex-shrink-0 mt-2" />
          <button
            onClick={() => setFilterDate("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
              filterDate === "all"
                ? "bg-gray-800 text-white"
                : "bg-white/70 text-gray-600 hover:bg-white"
            }`}
          >
            All Time
          </button>
          <button
            onClick={() => setFilterDate("today")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
              filterDate === "today"
                ? "bg-gray-800 text-white"
                : "bg-white/70 text-gray-600 hover:bg-white"
            }`}
          >
            Today
          </button>
          <button
            onClick={() => setFilterDate("week")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
              filterDate === "week"
                ? "bg-gray-800 text-white"
                : "bg-white/70 text-gray-600 hover:bg-white"
            }`}
          >
            This Week
          </button>
          <button
            onClick={() => setFilterDate("month")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
              filterDate === "month"
                ? "bg-gray-800 text-white"
                : "bg-white/70 text-gray-600 hover:bg-white"
            }`}
          >
            This Month
          </button>
        </div>
      </div>

      {/* Transactions List */}
      <div className="px-6">
        {filteredTransactions.length > 0 ? (
          <div className="space-y-3">
            {filteredTransactions.map((transaction) => {
              const transactionGroup = groups.find(g => g.id === transaction.groupId);
              
              return (
                <div
                  key={transaction.id}
                  className="w-full bg-white/70 backdrop-blur-lg rounded-2xl p-4 border border-white/40"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${getTransactionColor(transaction.type)}`}>
                      {getTransactionIcon(transaction.type)}
                    </div>
                    
                    <div className="flex-1 text-left">
                      <div className="font-medium text-gray-900 mb-1">{transaction.title}</div>
                      <div className="text-sm text-gray-500">
                        {transactionGroup && <span className="font-medium text-emerald-600">{transactionGroup.name}</span>}
                        {transactionGroup && <span> • </span>}
                        {transaction.date}
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className={`font-bold text-lg ${
                        transaction.type === "expense" ? "text-red-500" : "text-emerald-500"
                      }`}>
                        {transaction.type === "expense" ? "-" : "+"}Rs {transaction.amount.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white/70 backdrop-blur-lg rounded-2xl p-12 text-center border border-white/40">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <ActivityIcon className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No transactions found</h3>
            <p className="text-gray-500">
              {searchQuery ? "Try a different search term" : "Start adding expenses to see your activity"}
            </p>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />
    </div>
  );
};

export default Activity;
