import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Users, Plus, Search, Filter, Eye, TrendingUp, TrendingDown, Star } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import Sidebar from "@/components/Sidebar";
import DesktopHeader from "@/components/DesktopHeader";
import AppContainer from "@/components/AppContainer";
import CreateGroupSheet from "@/components/CreateGroupSheet";
import MemberSettlementSheet from "@/components/MemberSettlementSheet";
import PageGuide from "@/components/PageGuide";
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
  const [searchQuery, setSearchQuery] = useState("");
  const [showSettlement, setShowSettlement] = useState(false);
  const [selectedSettlement, setSelectedSettlement] = useState<{ groupId: string; memberId: string; memberName: string; isTemporary?: boolean } | null>(null);
  const [activeFilter, setActiveFilter] = useState<"all" | "unsettled" | "favorites">("all");
  const [favoriteGroups, setFavoriteGroups] = useState<string[]>(() => {
    // Load favorites from localStorage
    const saved = localStorage.getItem(`favoriteGroups_${user?.uid}`);
    return saved ? JSON.parse(saved) : [];
  });

  // Pre-calculate all group settlements
  const groupSettlementsMap = useMemo(() => {
    const settlementsMap: Record<string, any> = {};
    groups.forEach((group) => {
      settlementsMap[group.id] = getSettlements(group.id);
    });
    return settlementsMap;
  }, [groups, getSettlements]);

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
    if (tab === "home") navigate("/");
    else if (tab === "profile") navigate("/profile");
    else if (tab === "activity") navigate("/activity");
    else if (tab === "add") setShowCreateGroup(true);
    else setActiveTab(tab);
  };

  const handleGroupClick = (groupId: string) => {
    navigate(`/group/${groupId}`);
  };

  const handleGroupSubmit = async (data: {
    name: string;
    emoji: string;
    members: { name: string; phone?: string; paymentDetails?: any }[];
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

  // Toggle favorite
  const toggleFavorite = (groupId: string) => {
    setFavoriteGroups(prev => {
      const newFavorites = prev.includes(groupId)
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId];

      // Save to localStorage
      localStorage.setItem(`favoriteGroups_${user?.uid}`, JSON.stringify(newFavorites));

      return newFavorites;
    });
  };

  // Filter and search groups
  const filteredGroups = useMemo(() => {
    let filtered = groups;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(group => {
        // Search in group name
        if (group.name.toLowerCase().includes(query)) return true;

        // Search in member names
        if (group.members.some(m => m.name.toLowerCase().includes(query))) return true;

        return false;
      });
    }

    // Apply category filter
    if (activeFilter === "unsettled") {
      filtered = filtered.filter(group => {
        const groupSettlements = groupSettlementsMap[group.id] || {};
        let toReceive = 0;
        let toPay = 0;

        Object.values(groupSettlements).forEach((settlement: any) => {
          toReceive += settlement.toReceive || 0;
          toPay += settlement.toPay || 0;
        });

        return toReceive > 0 || toPay > 0;
      });
    } else if (activeFilter === "favorites") {
      filtered = filtered.filter(group => favoriteGroups.includes(group.id));
    }

    return filtered;
  }, [groups, searchQuery, activeFilter, groupSettlementsMap, favoriteGroups]);

  // Get gradient colors for group cards
  const getGroupGradient = (index: number) => {
    const gradients = [
      "from-[#4a6850] to-[#3d5643]",
      "from-orange-400 to-red-500",
      "from-blue-400 to-indigo-600",
      "from-teal-400 to-emerald-600",
      "from-purple-400 to-pink-500",
      "from-yellow-400 to-orange-500",
    ];
    return gradients[index % gradients.length];
  };

  return (
    <>
      <Sidebar />

      <AppContainer className="bg-[#F8F9FA]">
        <DesktopHeader />

        {/* Header Section */}
        <header className="p-4 lg:p-8 pb-4">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-4 lg:mb-6 gap-4">
            <h2 className="text-2xl lg:text-4xl font-black text-gray-900 tracking-tight">Your Groups</h2>
            <button
              onClick={() => setShowCreateGroup(true)}
              className="bg-[#4a6850] hover:bg-[#3d5643] text-white px-4 lg:px-6 py-2 lg:py-3 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-[#4a6850]/25 text-sm lg:text-base w-full lg:w-auto justify-center"
            >
              <Plus className="w-4 lg:w-5 h-4 lg:h-5" />
              <span>Create New Group</span>
            </button>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col lg:flex-row lg:flex-wrap items-stretch lg:items-center gap-3 lg:gap-4">
            <div className="flex-1 lg:min-w-[300px]">
              <div className="relative group">
                <Search className="absolute left-3 lg:left-4 top-1/2 -translate-y-1/2 w-4 lg:w-5 h-4 lg:h-5 text-slate-400 group-focus-within:text-[#4a6850] transition-colors" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white border-none rounded-xl py-2 lg:py-3 pl-10 lg:pl-12 pr-3 lg:pr-4 focus:ring-2 focus:ring-[#4a6850] shadow-sm text-sm placeholder:text-slate-400"
                  placeholder="Search groups, members, or expenses..."
                />
              </div>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 lg:pb-0 hide-scrollbar">
              <button
                onClick={() => setActiveFilter("all")}
                className={`px-3 lg:px-4 py-2 rounded-xl text-xs lg:text-sm font-semibold border flex items-center gap-2 transition-all whitespace-nowrap flex-shrink-0 ${activeFilter === "all"
                    ? "bg-[#4a6850] text-white border-[#4a6850] shadow-lg"
                    : "bg-white text-slate-600 border-slate-100 hover:bg-slate-50"
                  }`}
              >
                <Filter className="w-3 lg:w-4 h-3 lg:h-4" />
                All
              </button>
              <button
                onClick={() => setActiveFilter("unsettled")}
                className={`px-3 lg:px-4 py-2 rounded-xl text-xs lg:text-sm font-semibold border transition-all whitespace-nowrap flex-shrink-0 ${activeFilter === "unsettled"
                    ? "bg-[#4a6850] text-white border-[#4a6850] shadow-lg"
                    : "bg-white text-slate-600 border-slate-100 hover:bg-slate-50"
                  }`}
              >
                Unsettled
              </button>
              <button
                onClick={() => setActiveFilter("favorites")}
                className={`px-3 lg:px-4 py-2 rounded-xl text-xs lg:text-sm font-semibold border transition-all whitespace-nowrap flex-shrink-0 ${activeFilter === "favorites"
                    ? "bg-[#4a6850] text-white border-[#4a6850] shadow-lg"
                    : "bg-white text-slate-600 border-slate-100 hover:bg-slate-50"
                  }`}
              >
                Favorites
              </button>
            </div>
          </div>
        </header>

        {/* Group Grid */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-8 pt-4 pb-24 lg:pb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
            {filteredGroups.map((group, index) => {
              const groupSettlements = groupSettlementsMap[group.id] || {};
              let toReceive = 0;
              let toPay = 0;

              Object.values(groupSettlements).forEach((settlement: any) => {
                toReceive += settlement.toReceive || 0;
                toPay += settlement.toPay || 0;
              });

              const hasReceivable = toReceive > 0;
              const hasPayable = toPay > 0;
              const isSettled = toReceive === 0 && toPay === 0;

              // Find the member to settle with (the one with the highest amount)
              const memberToSettle = Object.entries(groupSettlements).reduce((max, [memberId, settlement]: [string, any]) => {
                const totalAmount = (settlement.toReceive || 0) + (settlement.toPay || 0);
                const maxAmount = (max.settlement?.toReceive || 0) + (max.settlement?.toPay || 0);
                return totalAmount > maxAmount ? { memberId, settlement } : max;
              }, { memberId: '', settlement: null as any });

              const memberObj = group.members.find(m => m.id === memberToSettle.memberId);
              const memberName = memberObj?.name || '';
              const isTemporary = memberObj?.isTemporary || false;

              const handleSettleClick = (e: React.MouseEvent) => {
                e.stopPropagation();
                if (!isSettled && memberToSettle.memberId) {
                  setSelectedSettlement({
                    groupId: group.id,
                    memberId: memberToSettle.memberId,
                    memberName: memberName,
                    isTemporary: isTemporary
                  });
                  setShowSettlement(true);
                }
              };

              return (
                <div
                  key={group.id}
                  onClick={() => handleGroupClick(group.id)}
                  className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all border border-slate-100 cursor-pointer"
                >
                  {/* Header with gradient */}
                  <div className={`h-24 lg:h-32 w-full bg-gradient-to-br ${getGroupGradient(index)} relative`}>
                    <div className="absolute top-3 lg:top-4 right-3 lg:right-4 flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(group.id);
                        }}
                        className="bg-white/20 backdrop-blur-md p-2 rounded-full hover:bg-white/30 transition-all active:scale-95"
                      >
                        <Star
                          className={`w-4 h-4 ${favoriteGroups.includes(group.id)
                              ? "fill-yellow-400 text-yellow-400"
                              : "text-white"
                            }`}
                        />
                      </button>
                      <div className="bg-white/20 backdrop-blur-md px-2 lg:px-3 py-1 rounded-full text-[9px] lg:text-[10px] font-bold text-white uppercase tracking-wider">
                        {isSettled ? "Settled" : "Active"}
                      </div>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-4 lg:p-5">
                    <div className="flex justify-between items-start mb-3 lg:mb-4">
                      <div className="flex-1 min-w-0 mr-2">
                        <h3 className="text-base lg:text-lg font-bold text-gray-900 truncate">{group.name}</h3>
                        <p className="text-slate-500 text-xs font-medium">
                          {group.members.length} members
                        </p>
                      </div>
                      <div className="flex -space-x-2 flex-shrink-0">
                        {group.members.slice(0, 3).map((member, idx) => (
                          <div
                            key={member.id}
                            className="w-7 lg:w-8 h-7 lg:h-8 rounded-full border-2 border-white bg-gradient-to-br from-[#4a6850] to-[#3d5643] flex items-center justify-center text-white text-xs font-bold"
                          >
                            {member.name.charAt(0).toUpperCase()}
                          </div>
                        ))}
                        {group.members.length > 3 && (
                          <div className="w-7 lg:w-8 h-7 lg:h-8 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500">
                            +{group.members.length - 3}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Status */}
                    <div className="mb-3 lg:mb-4">
                      <p className="text-[10px] lg:text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Status</p>
                      {isSettled ? (
                        <p className="text-slate-400 font-bold text-sm lg:text-lg">No pending dues</p>
                      ) : (
                        <div className="space-y-1">
                          {hasReceivable && (
                            <p className="text-emerald-600 font-bold text-sm lg:text-lg">You will receive Rs {toReceive.toLocaleString()}</p>
                          )}
                          {hasPayable && (
                            <p className="text-rose-500 font-bold text-sm lg:text-lg">You owe Rs {toPay.toLocaleString()}</p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Actions - Always visible on mobile, hover on desktop */}
                    <div className="flex gap-2 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity duration-300">
                      <button
                        onClick={handleSettleClick}
                        className={`flex-1 text-white text-xs font-bold py-2 rounded-lg transition-colors ${isSettled
                            ? "bg-slate-200 text-slate-500 cursor-not-allowed"
                            : "bg-[#4a6850] hover:bg-[#3d5643]"
                          }`}
                        disabled={isSettled}
                      >
                        {isSettled ? "Settled" : "Settle Up"}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleGroupClick(group.id);
                        }}
                        className="px-3 bg-slate-100 text-slate-600 py-2 rounded-lg hover:bg-slate-200 transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Create New Group Card */}
            <div
              onClick={() => setShowCreateGroup(true)}
              className="border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center p-6 lg:p-8 group hover:border-[#4a6850] transition-colors cursor-pointer bg-white/50 min-h-[200px]"
            >
              <div className="w-10 lg:w-12 h-10 lg:h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-[#4a6850]/10 group-hover:text-[#4a6850] transition-all mb-3">
                <Plus className="w-5 lg:w-6 h-5 lg:h-6" />
              </div>
              <p className="text-xs lg:text-sm font-bold text-slate-500 group-hover:text-[#4a6850] transition-colors text-center">
                Create New Group
              </p>
            </div>
          </div>

          {/* Empty State */}
          {filteredGroups.length === 0 && groups.length > 0 && (
            <div className="text-center py-8 lg:py-12 bg-white rounded-3xl border border-slate-100 shadow-sm">
              <div className="w-16 lg:w-20 h-16 lg:h-20 bg-gradient-to-br from-[#4a6850]/20 to-[#3d5643]/20 rounded-3xl flex items-center justify-center mx-auto mb-4 lg:mb-6 shadow-lg">
                <Search className="w-8 lg:w-10 h-8 lg:h-10 text-[#4a6850] font-bold" />
              </div>
              <h3 className="text-xl lg:text-2xl font-black text-gray-900 mb-2 lg:mb-3 tracking-tight px-4">No groups found</h3>
              <p className="text-slate-500 mb-6 lg:mb-8 max-w-sm mx-auto leading-relaxed text-sm lg:text-base px-4">
                {searchQuery
                  ? `No groups match "${searchQuery}". Try a different search term.`
                  : activeFilter === "favorites"
                    ? "You haven't marked any groups as favorites yet."
                    : "All groups are settled up!"}
              </p>
              {(searchQuery || activeFilter !== "all") && (
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setActiveFilter("all");
                  }}
                  className="bg-gradient-to-r from-[#4a6850] to-[#3d5643] text-white px-6 lg:px-8 py-3 lg:py-4 rounded-2xl font-black hover:from-[#3d5643] hover:to-[#2f4336] hover:scale-105 active:scale-95 transition-all inline-flex items-center gap-2 lg:gap-3 shadow-lg hover:shadow-xl text-sm lg:text-base"
                >
                  Clear Filters
                </button>
              )}
            </div>
          )}

          {/* Empty State - No groups at all */}
          {groups.length === 0 && (
            <div className="text-center py-8 lg:py-12 bg-white rounded-3xl border border-slate-100 shadow-sm">
              <div className="w-16 lg:w-20 h-16 lg:h-20 bg-gradient-to-br from-[#4a6850]/20 to-[#3d5643]/20 rounded-3xl flex items-center justify-center mx-auto mb-4 lg:mb-6 shadow-lg">
                <Users className="w-8 lg:w-10 h-8 lg:h-10 text-[#4a6850] font-bold" />
              </div>
              <h3 className="text-xl lg:text-2xl font-black text-gray-900 mb-2 lg:mb-3 tracking-tight px-4">No groups yet</h3>
              <p className="text-slate-500 mb-6 lg:mb-8 max-w-sm mx-auto leading-relaxed text-sm lg:text-base px-4">
                Create your first group to start tracking shared expenses with friends, roommates, or colleagues.
              </p>
              <button
                onClick={() => setShowCreateGroup(true)}
                className="bg-gradient-to-r from-[#4a6850] to-[#3d5643] text-white px-6 lg:px-8 py-3 lg:py-4 rounded-2xl font-black hover:from-[#3d5643] hover:to-[#2f4336] hover:scale-105 active:scale-95 transition-all inline-flex items-center gap-2 lg:gap-3 shadow-lg hover:shadow-xl text-sm lg:text-base"
              >
                <Plus className="w-4 lg:w-5 h-4 lg:h-5 font-bold" />
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

        {/* Member Settlement Sheet */}
        {selectedSettlement && (
          <MemberSettlementSheet
            open={showSettlement}
            onClose={() => {
              setShowSettlement(false);
              setSelectedSettlement(null);
            }}
            member={{
              id: selectedSettlement.memberId,
              name: selectedSettlement.memberName,
              isTemporary: selectedSettlement.isTemporary,
            }}
            groupId={selectedSettlement.groupId}
          />
        )}
      </AppContainer>
    </>
  );
};

export default Groups;
