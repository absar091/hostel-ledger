import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Users, ChevronRight, Plus, TrendingUp, TrendingDown } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import CreateGroupSheet from "@/components/CreateGroupSheet";
import PageGuide from "@/components/PageGuide";
import Tooltip from "@/components/Tooltip";
import { toast } from "sonner";
import { useFirebaseAuth } from "@/contexts/FirebaseAuthContext";
import { useFirebaseData } from "@/contexts/FirebaseDataContext";
import { useUserPreferences } from "@/hooks/useUserPreferences";

const Groups = () => {
  const navigate = useNavigate();
  const { user, getSettlements } = useFirebaseAuth();
  const { groups, createGroup } = useFirebaseData();
  const { shouldShowPageGuide, markPageGuideShown } = useUserPreferences(user?.uid);
  
  const [activeTab, setActiveTab] = useState<"home" | "groups" | "add" | "activity" | "profile">("groups");
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showGroupsGuide, setShowGroupsGuide] = useState(false);

  // Pre-calculate all group settlements to avoid hooks inside map
  const groupSettlementsMap = useMemo(() => {
    const settlementsMap: Record<string, any> = {};
    groups.forEach((group) => {
      settlementsMap[group.id] = getSettlements(group.id);
    });
    return settlementsMap;
  }, [groups, getSettlements]);

  // Check if we should show page guide
  useEffect(() => {
    if (shouldShowPageGuide('groups')) {
      setShowGroupsGuide(true);
    }
  }, [shouldShowPageGuide]);

  const handleGroupsGuideClose = () => {
    setShowGroupsGuide(false);
    markPageGuideShown('groups');
  };

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
    <div className="min-h-screen bg-white pb-24">
      {/* iPhone-style top accent border */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#2f4336] via-[#4a6850] to-[#2f4336] z-50 shadow-sm"></div>
      
      {/* App Header - iPhone Style Enhanced with #4a6850 */}
      <div className="bg-white border-b border-[#4a6850]/10 pt-2 pb-3 px-4 sticky top-0 z-40 shadow-[0_4px_20px_rgba(74,104,80,0.08)]">
        <div className="flex items-center justify-between">
          {/* App Logo and Name - Enhanced */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-[#4a6850] to-[#3d5643] rounded-2xl flex items-center justify-center shadow-lg">
              <img
                src="/only-logo.png"
                alt="Hostel Ledger"
                className="w-6 h-6 object-contain filter brightness-0 invert"
              />
            </div>
            <h1 className="text-xl font-black text-gray-900 tracking-tight">Hostel Ledger</h1>
          </div>
          
          {/* Header Actions - Enhanced */}
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 bg-gradient-to-br from-[#4a6850] to-[#3d5643] rounded-3xl flex items-center justify-center shadow-lg">
              <Users className="w-7 h-7 text-white font-bold" />
            </div>
          </div>
        </div>
      </div>

      {/* Header - iPhone Style Enhanced */}
      <div className="px-6 pt-8 pb-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <div className="text-sm text-[#4a6850]/80 mb-1 font-black tracking-wide">{getGreeting()}</div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Your Groups</h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowCreateGroup(true)}
              className="w-12 h-12 bg-gradient-to-r from-[#4a6850] to-[#3d5643] rounded-2xl flex items-center justify-center shadow-lg hover:from-[#3d5643] hover:to-[#2f4336] hover:scale-105 active:scale-95 transition-all"
            >
              <Plus className="w-6 h-6 text-white font-bold" />
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
          <div className="space-y-3">
            {groups.map((group) => {
              // Use pre-calculated settlements
              const groupSettlements = groupSettlementsMap[group.id] || {};
              
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
                  className="w-full bg-white rounded-3xl p-6 shadow-[0_20px_60px_rgba(74,104,80,0.12)] border border-[#4a6850]/10 hover:shadow-[0_25px_70px_rgba(74,104,80,0.18)] hover:border-[#4a6850]/20 active:scale-[0.99] transition-all duration-300 text-left group"
                >
                  <div className="flex items-start gap-4">
                    {/* Group Icon - iPhone Style with #4a6850 */}
                    <div className="w-12 h-12 bg-gradient-to-br from-[#4a6850] to-[#3d5643] rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg group-hover:scale-105 transition-transform duration-200">
                      <Users className="w-5 h-5 text-white font-bold" />
                    </div>
                    
                    {/* Group Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0 mr-3">
                          <h3 className="text-lg font-black text-gray-900 truncate leading-tight mb-1 tracking-tight">{group.name}</h3>
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 bg-[#4a6850]/60 rounded-full"></div>
                            <span className="text-sm text-[#4a6850]/80 font-black">{group.members.length} members</span>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-[#4a6850]/60 flex-shrink-0 group-hover:text-[#4a6850] transition-colors" />
                      </div>
                      
                      {/* Balance Info - Enhanced iPhone Style */}
                      <div className="bg-[#4a6850]/5 rounded-2xl p-4 border border-[#4a6850]/10">
                        {!hasReceivable && !hasPayable ? (
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-2 h-2 bg-[#4a6850] rounded-full"></div>
                            <span className="text-sm text-[#4a6850] font-black">All settled up! 🎉</span>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {hasReceivable && (
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 bg-[#4a6850] rounded-full"></div>
                                  <span className="text-xs text-[#4a6850]/80 font-black">You'll receive</span>
                                </div>
                                <span className="text-sm font-black text-[#4a6850] tabular-nums">
                                  Rs {toReceive.toLocaleString()}
                                </span>
                              </div>
                            )}
                            {hasPayable && (
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                                  <span className="text-xs text-orange-600 font-black">You owe</span>
                                </div>
                                <span className="text-sm font-black text-orange-600 tabular-nums">
                                  Rs {toPay.toLocaleString()}
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      
                      {/* Action hint - Enhanced */}
                      <div className="mt-3 text-center">
                        <span className="text-xs text-[#4a6850]/60 bg-[#4a6850]/10 px-3 py-1 rounded-full font-black">Tap to view details</span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-3xl p-12 text-center shadow-[0_20px_60px_rgba(74,104,80,0.12)] border border-[#4a6850]/10">
            <div className="w-20 h-20 bg-gradient-to-br from-[#4a6850] to-[#3d5643] rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg">
              <Users className="w-10 h-10 text-white font-bold" />
            </div>
            <h3 className="text-2xl font-black text-gray-900 mb-3 tracking-tight">No groups yet</h3>
            <p className="text-[#4a6850]/80 mb-8 max-w-sm mx-auto leading-relaxed font-bold">
              Create your first group to start tracking shared expenses with friends, roommates, or colleagues.
            </p>
            <button
              onClick={() => setShowCreateGroup(true)}
              className="bg-gradient-to-r from-[#4a6850] to-[#3d5643] text-white px-8 py-4 rounded-2xl font-black hover:from-[#3d5643] hover:to-[#2f4336] hover:scale-105 active:scale-95 transition-all inline-flex items-center gap-3 shadow-lg hover:shadow-xl"
            >
              <Plus className="w-5 h-5 font-bold" />
              Create Your First Group
            </button>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />

      {/* Groups Page Guide */}
      <PageGuide
        title="Groups & Expenses"
        description="Manage your expense groups here. Create groups with friends, roommates, or colleagues to split bills easily."
        tips={[
          "Tap the + button to create your first group",
          "Add members with their phone numbers for easy identification",
          "Each group shows your balance - green means you'll receive money, red means you owe"
        ]}
        emoji="👥"
        show={showGroupsGuide}
        onClose={handleGroupsGuideClose}
      />

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