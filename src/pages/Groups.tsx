import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users, ChevronRight, Plus, TrendingUp, TrendingDown } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import CreateGroupSheet from "@/components/CreateGroupSheet";
import Tooltip from "@/components/Tooltip";
import { toast } from "sonner";
import { useFirebaseAuth } from "@/contexts/FirebaseAuthContext";
import { useFirebaseData } from "@/contexts/FirebaseDataContext";

const Groups = () => {
  const navigate = useNavigate();
  const { user } = useFirebaseAuth();
  const { groups, createGroup } = useFirebaseData();
  
  const [activeTab, setActiveTab] = useState<"home" | "groups" | "add" | "activity" | "profile">("groups");
  const [showCreateGroup, setShowCreateGroup] = useState(false);

  const handleTabChange = (tab: typeof activeTab) => {
    if (tab === "home") {
      navigate("/");
    } else if (tab === "profile") {
      navigate("/profile");
    } else if (tab === "activity") {
      navigate("/activity");
    } else if (tab === "add") {
      setShowCreateGroup(true);
    } else {
      setActiveTab(tab);
    }
  };

  const handleGroupClick = (groupId: string) => {
    navigate(`/group/${groupId}`);
  };

  const handleGroupSubmit = async (data: {
    name: string;
    emoji: string;
    members: { name: string; phone?: string; paymentDetails?: { jazzCash?: string; easypaisa?: string; bankName?: string; accountNumber?: string; raastId?: string } }[];
  }) => {
    const result = await createGroup({
      name: data.name,
      emoji: data.emoji,
      members: data.members.map((m) => ({
        name: m.name,
        phone: m.phone,
        paymentDetails: m.paymentDetails,
      })),
    });
    
    if (result.success) {
      toast.success(`Created group "${data.name}"`);
    } else {
      toast.error(result.error || "Failed to create group");
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-green-50 pb-24">
      {/* Header */}
      <div className="px-6 pt-12 pb-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <div className="text-sm text-gray-500 mb-1">{getGreeting()}</div>
            <h1 className="text-3xl font-bold text-gray-900">Your Groups</h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowCreateGroup(true)}
              className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full flex items-center justify-center shadow-lg hover:from-emerald-600 hover:to-teal-600 transition-all backdrop-blur-lg border border-white/20"
            >
              <Plus className="w-6 h-6 text-white" />
            </button>
            <Tooltip 
              content="Create a new group to track shared expenses with friends, family, or colleagues."
              position="left"
            />
          </div>
        </div>
      </div>

      {/* Groups List */}
      <div className="px-6">
        {groups.length > 0 ? (
          <div className="space-y-4">
            {groups.map((group) => {
              // Get settlements for this specific group
              const { getSettlements } = useFirebaseAuth();
              const groupSettlements = getSettlements(group.id);
              
              // Calculate totals
              let toReceive = 0;
              let toPay = 0;
              
              Object.values(groupSettlements).forEach((settlement: any) => {
                toReceive += settlement.toReceive || 0;
                toPay += settlement.toPay || 0;
              });
              
              const hasReceivable = toReceive > 0;
              const hasPayable = toPay > 0;
              
              return (
                <button
                  key={group.id}
                  onClick={() => handleGroupClick(group.id)}
                  className="w-full bg-white/70 backdrop-blur-lg rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-200 border border-white/40 hover:bg-white/80"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-emerald-100 to-teal-100 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-emerald-200/50">
                      <Users className="w-8 h-8 text-emerald-600" />
                    </div>
                    
                    <div className="flex-1 text-left">
                      <h3 className="text-lg font-bold text-gray-900 mb-1">{group.name}</h3>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Users className="w-4 h-4" />
                        <span>{group.members.length} members</span>
                      </div>
                    </div>
                    
                    <div className="text-right flex-shrink-0">
                      {!hasReceivable && !hasPayable ? (
                        <div className="text-sm text-emerald-600 font-medium">
                          ✓ All settled
                        </div>
                      ) : (
                        <div className="space-y-1">
                          {hasReceivable && (
                            <div className="flex items-center gap-1 justify-end">
                              <TrendingDown className="w-3 h-3 text-emerald-500" />
                              <span className="text-sm font-semibold text-emerald-600 whitespace-nowrap">
                                +Rs {toReceive.toLocaleString()}
                              </span>
                            </div>
                          )}
                          {hasPayable && (
                            <div className="flex items-center gap-1 justify-end">
                              <TrendingUp className="w-3 h-3 text-red-500" />
                              <span className="text-sm font-semibold text-red-600 whitespace-nowrap">
                                -Rs {toPay.toLocaleString()}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <ChevronRight className="w-6 h-6 text-gray-400 flex-shrink-0" />
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="bg-white/70 backdrop-blur-lg rounded-2xl p-12 text-center shadow-lg border border-white/40">
            <div className="w-20 h-20 bg-emerald-100/80 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-200/50">
              <Users className="w-10 h-10 text-emerald-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">No groups yet</h3>
            <p className="text-gray-500 mb-8 max-w-sm mx-auto">
              Create your first group to start tracking shared expenses with friends, roommates, or colleagues.
            </p>
            <button
              onClick={() => setShowCreateGroup(true)}
              className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-8 py-4 rounded-xl font-medium hover:from-emerald-600 hover:to-teal-600 transition-all inline-flex items-center gap-2 shadow-lg"
            >
              <Plus className="w-5 h-5" />
              Create Your First Group
            </button>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />

      {/* Create Group Sheet */}
      <CreateGroupSheet
        open={showCreateGroup}
        onClose={() => setShowCreateGroup(false)}
        onSubmit={handleGroupSubmit}
      />
    </div>
  );
};

export default Groups;