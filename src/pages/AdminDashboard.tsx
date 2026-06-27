import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  MessageCircle,
  Send,
  Search,
  Filter,
  CircleCheck,
  Clock,
  CircleAlert,
  User,
  Mail,
  Phone,
  Calendar,
  Loader2,
  X,
  ArrowLeft,
  Bell,
  TrendingUp,
  Users,
  MessageSquare,
  FileText,
  Settings,
  Shield,
  Trash2,
  Lock,
  RefreshCw,
  Zap,
  Smartphone,
  Info,
  ChevronRight,
  AlertTriangle,
  History,
  Activity,
  CheckCircle2,
  LockKeyhole,
  MessageSquareText,
  UserPlus,
  DollarSign
} from "@/lib/icons";
import { useCurrency } from "@/contexts/CurrencyContext";
import { ref, onValue, off, set, push, update } from "firebase/database";
import { database } from "@/lib/firebase";
import { useFirebaseAuth } from "@/contexts/FirebaseAuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

import * as api from "@/lib/api";

// --- TYPES ---

interface AdminUser {
  uid: string;
  email: string;
  displayName: string;
  disabled: boolean;
  role: string;
  accountStatus: string;
  walletBalance: number;
  createdAt: string;
  lastSignIn: string;
}

interface AdminGroup {
  id: string;
  name: string;
  emoji: string;
  createdAt: string;
  memberCount: number;
  members?: Record<string, any>;
}

interface Ticket {
  id: string;
  userId: string;
  ticketNumber: string;
  userName: string;
  userEmail: string;
  subject: string;
  status: "open" | "replied" | "resolved" | "closed";
  priority: "low" | "medium" | "high";
  createdAt: number;
  updatedAt: number;
  messages?: any;
}

interface Report {
  id: string;
  reporterId: string;
  reporterName: string;
  type: 'bug' | 'abuse' | 'feedback' | 'other';
  description: string;
  createdAt: number;
  status: 'pending' | 'reviewed' | 'resolved';
}

interface SystemStats {
  totalUsers: number;
  totalGroups: number;
  maintenanceMode: boolean;
}

// --- MAIN COMPONENT ---

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user, firebaseUser } = useFirebaseAuth();
  const { formatAmount } = useCurrency();
  const [activeTab, setActiveTab] = useState<"overview" | "users" | "groups" | "tickets" | "reports" | "system">("overview");
  
  // Data State
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [groups, setGroups] = useState<AdminGroup[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  
  // Selection State
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [detailedGroup, setDetailedGroup] = useState<AdminGroup | null>(null);
  
  // UI State
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isActionLoading, setIsActionLoading] = useState<string | null>(null);
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [replyMessage, setReplyMessage] = useState("");
  const [passwordResetValue, setPasswordResetValue] = useState("");
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const dataFetchedRef = useRef(false);

  // Check if user is admin
  const isSuperAdmin = user?.role === 'superadmin';
  const isAdmin = user?.role === 'admin' || isSuperAdmin;
  const isActive = user?.accountStatus === 'active';
  const isAuthorized = isAdmin && isActive;

  // Handle authorization redirect
  useEffect(() => {
    if (!isLoading && !isAuthorized) {
      toast.error("Access Denied: Unrecognized Credentials");
      navigate("/");
    }
  }, [isAuthorized, isLoading, navigate]);

  // Handle data fetching
  useEffect(() => {
    if (isAuthorized) {
      fetchDashboardData();
    }
    // We intentionally exclude fetchDashboardData from dependencies to avoid loop
    // and only fetch when authorization state changes to true.
  }, [isAuthorized]);

  const fetchDashboardData = async () => {
    if (dataFetchedRef.current) return;
    setIsLoading(true);
    dataFetchedRef.current = true;
    try {
      const [statsData, usersData, groupsData, ticketsData, reportsData] = await Promise.all([
        api.adminGetSystemStats(),
        api.adminGetUsers(),
        api.adminGetGroups(),
        api.adminGetTickets(),
        api.adminGetReports().catch(() => []) // Fallback if reports node doesn't exist
      ]);
      setStats(statsData);
      setUsers(usersData);
      setGroups(groupsData);
      setTickets(ticketsData);
      
      // Enrich reports with reporter names if missing
      const enrichedReports = reportsData.map((r: any) => {
        if (!r.reporterName) {
           const reporter = usersData.find((u: any) => u.uid === r.reportedBy);
           return { ...r, reporterName: reporter?.displayName || 'Unknown Subject' };
        }
        return r;
      });
      setReports(enrichedReports);
    } catch (error) {
      console.error("Error fetching admin data:", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setIsLoading(false);
    }
  };

  // --- ACTIONS ---

  const handleUpdateUserStatus = async (uid: string, status: 'active' | 'disabled' | 'banned') => {
    if (uid === user?.uid) {
      toast.error("You cannot change your own status");
      return;
    }
    setIsActionLoading(uid);
    try {
      await api.adminUpdateUserStatus(uid, status);
      toast.success(`User status updated to ${status}`);
      setUsers(prev => prev.map(u => u.uid === uid ? { ...u, accountStatus: status, disabled: status !== 'active' } : u));
      if (selectedUser?.uid === uid) setSelectedUser(prev => prev ? { ...prev, accountStatus: status } : null);
    } catch (error) {
      toast.error("Failed to update status");
    } finally {
      setIsActionLoading(null);
    }
  };

  const handleResetUserPassword = async (uid: string) => {
    if (!passwordResetValue || passwordResetValue.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setIsActionLoading('password');
    try {
      await api.adminResetUserPassword(uid, passwordResetValue);
      toast.success("Password reset successfully");
      setPasswordResetValue("");
    } catch (error) {
      toast.error("Failed to reset password");
    } finally {
      setIsActionLoading(null);
    }
  };

  const handleResetUserWallet = async (uid: string) => {
    if (!confirm("Are you sure you want to reset this user's wallet to 0?")) return;
    setIsActionLoading(uid);
    try {
      await api.adminResetUserWallet(uid);
      toast.success("Wallet reset successfully");
      setUsers(prev => prev.map(u => u.uid === uid ? { ...u, walletBalance: 0 } : u));
    } catch (error) {
      toast.error("Failed to reset wallet");
    } finally {
      setIsActionLoading(null);
    }
  };

  const handleDeleteUser = async (uid: string) => {
    if (!confirm("CRITICAL ACTION: This will delete the user from AUTH and DB. Continue?")) return;
    setIsActionLoading(uid);
    try {
      await api.adminDeleteUser(uid);
      toast.success("User deleted permanently");
      setUsers(prev => prev.filter(u => u.uid !== uid));
      setSelectedUser(null);
    } catch (error) {
      toast.error("Failed to delete user");
    } finally {
      setIsActionLoading(null);
    }
  };

  const handleToggleMaintenance = async (enabled: boolean) => {
    setIsActionLoading('maintenance');
    try {
      await api.adminToggleMaintenance(enabled);
      setStats(prev => prev ? { ...prev, maintenanceMode: enabled } : null);
      toast.success(`Maintenance mode ${enabled ? 'enabled' : 'disabled'}`);
    } catch (error) {
      toast.error("Failed to toggle maintenance mode");
    } finally {
      setIsActionLoading(null);
    }
  };

  const handleBroadcast = async () => {
    if (!broadcastTitle || !broadcastMessage) {
      toast.error("Title and message required");
      return;
    }
    setIsActionLoading('broadcast');
    try {
      await api.adminBroadcast(broadcastTitle, broadcastMessage);
      toast.success("Broadcast message sent to all users");
      setBroadcastTitle("");
      setBroadcastMessage("");
    } catch (error) {
      toast.error("Failed to send broadcast");
    } finally {
      setIsActionLoading(null);
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (!confirm("FORCE DELETE: This will remove the group and all its transactions for everyone. Continue?")) return;
    setIsActionLoading(groupId);
    try {
      await api.adminDeleteGroupForce(groupId);
      toast.success("Group deleted successfully");
      setGroups(prev => prev.filter(g => g.id !== groupId));
      setDetailedGroup(null);
    } catch (error) {
      toast.error("Failed to delete group");
    } finally {
      setIsActionLoading(null);
    }
  };

  const handleRemoveMemberForce = async (groupId: string, uid: string) => {
    if (!confirm("Remove this member from group?")) return;
    setIsActionLoading(uid);
    try {
      await api.adminRemoveMemberForce(groupId, uid);
      toast.success("Member removed");
      // Update local state for member count and list
      setGroups(prev => prev.map(g => g.id === groupId ? { ...g, memberCount: g.memberCount - 1 } : g));
      if (detailedGroup && detailedGroup.members) {
        const newMembers = { ...detailedGroup.members };
        delete newMembers[uid];
        setDetailedGroup({ ...detailedGroup, members: newMembers, memberCount: detailedGroup.memberCount - 1 });
      }
    } catch (error) {
      toast.error("Failed to remove member");
    } finally {
      setIsActionLoading(null);
    }
  };

  const handleReplyTicket = async () => {
    if (!replyMessage.trim() || !selectedTicket) return;
    setIsActionLoading('reply');
    try {
      await api.adminReplyTicket(selectedTicket.id, selectedTicket.userId, replyMessage);
      toast.success("Reply sent");
      setReplyMessage("");
      // Refresh tickets to show updated status
      const updatedTickets = await api.adminGetTickets();
      setTickets(updatedTickets);
      setSelectedTicket(updatedTickets.find((t: Ticket) => t.id === selectedTicket.id) || null);
    } catch (error) {
      toast.error("Failed to send reply");
    } finally {
      setIsActionLoading(null);
    }
  };

  const handleUpdateTicketStatus = async (status: string) => {
    if (!selectedTicket) return;
    setIsActionLoading('status');
    try {
      await api.adminUpdateTicketStatus(selectedTicket.id, selectedTicket.userId, status);
      toast.success(`Ticket marked as ${status}`);
      // Refresh tickets to show updated status
      const updatedTickets = await api.adminGetTickets();
      setTickets(updatedTickets);
      setSelectedTicket(updatedTickets.find((t: Ticket) => t.id === selectedTicket.id) || null);
    } catch (error) {
      toast.error("Failed to update status");
    } finally {
      setIsActionLoading(null);
    }
  };

  // --- RENDER HELPERS ---

  if (!isAdmin) return null;

  const filteredUsers = users.filter(u => 
    u.displayName.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.uid.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredGroups = groups.filter(g => 
    g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    g.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredTickets = tickets.filter(t => 
    (statusFilter === 'all' || t.status === statusFilter) &&
    (t.subject.toLowerCase().includes(searchQuery.toLowerCase()) || 
     t.ticketNumber.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredReports = reports.filter(r => 
    r.reporterName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-white pb-24 lg:pb-0">

      <main className="flex-1 w-full max-w-[1600px] mx-auto flex flex-col lg:flex-row gap-8 p-4 lg:p-10 pb-24 lg:pb-12 transition-all duration-500">
        
        {/* Sidebar Navigation */}
        <aside className="lg:w-72 flex lg:flex-col gap-3 overflow-x-auto lg:overflow-x-visible pb-4 lg:pb-0 scrollbar-none sticky top-24 z-10 lg:h-fit">
          <div className="hidden lg:block mb-4 px-4">
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Main Control</h2>
          </div>
          
          <button 
            onClick={() => setActiveTab('overview')}
            className={cn(
              "flex-shrink-0 flex items-center gap-3 px-6 py-4 rounded-2xl transition-all duration-300 font-bold group relative overflow-hidden text-sm",
              activeTab === 'overview' 
                ? "bg-emerald-600 text-white shadow-xl shadow-emerald-200 translate-x-1" 
                : "bg-white/60 backdrop-blur-md text-gray-600 hover:bg-white hover:shadow-md border border-gray-100/50"
            )}
          >
            <TrendingUp className={cn("w-5 h-5 transition-transform group-hover:scale-110", activeTab === 'overview' ? "text-white" : "text-emerald-600")} />
            <span>Overview</span>
            {activeTab === 'overview' && (
              <div className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-white rounded-full transition-all duration-500" />
            )}
          </button>

          <button 
            onClick={() => setActiveTab('users')}
            className={cn(
              "flex-shrink-0 flex items-center gap-3 px-6 py-4 rounded-2xl transition-all duration-300 font-bold group relative overflow-hidden text-sm",
              activeTab === 'users' 
                ? "bg-emerald-600 text-white shadow-xl shadow-emerald-200 translate-x-1" 
                : "bg-white/60 backdrop-blur-md text-gray-600 hover:bg-white hover:shadow-md border border-gray-100/50"
            )}
          >
            <User className={cn("w-5 h-5 transition-transform group-hover:scale-110", activeTab === 'users' ? "text-white" : "text-emerald-600")} />
            <span>Users</span>
            {activeTab === 'users' && (
              <div className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-white rounded-full transition-all duration-500" />
            )}
          </button>
          <button 
            onClick={() => setActiveTab('groups')}
            className={cn(
              "flex-shrink-0 flex items-center gap-3 px-6 py-4 rounded-2xl transition-all duration-300 font-bold group relative overflow-hidden text-sm",
              activeTab === 'groups' 
                ? "bg-emerald-600 text-white shadow-xl shadow-emerald-200 translate-x-1" 
                : "bg-white/60 backdrop-blur-md text-gray-600 hover:bg-white hover:shadow-md border border-gray-100/50"
            )}
          >
            <Users className={cn("w-5 h-5 transition-transform group-hover:scale-110", activeTab === 'groups' ? "text-white" : "text-emerald-600")} />
            <span>Groups</span>
            {activeTab === 'groups' && (
              <div className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-white rounded-full transition-all duration-500" />
            )}
          </button>

          <button 
            onClick={() => setActiveTab('tickets')}
            className={cn(
              "flex-shrink-0 flex items-center gap-3 px-6 py-4 rounded-2xl transition-all duration-300 font-bold group relative overflow-hidden text-sm",
              activeTab === 'tickets' 
                ? "bg-emerald-600 text-white shadow-xl shadow-emerald-200 translate-x-1" 
                : "bg-white/60 backdrop-blur-md text-gray-600 hover:bg-white hover:shadow-md border border-gray-100/50"
            )}
          >
            <MessageSquare className={cn("w-5 h-5 transition-transform group-hover:scale-110", activeTab === 'tickets' ? "text-white" : "text-emerald-600")} />
            <span>Support</span>
            {activeTab === 'tickets' && (
              <div className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-white rounded-full transition-all duration-500" />
            )}
          </button>
          <button 
            onClick={() => setActiveTab('reports')}
            className={cn(
              "flex-shrink-0 flex items-center gap-3 px-6 py-4 rounded-2xl transition-all duration-300 font-bold group relative overflow-hidden text-sm",
              activeTab === 'reports' 
                ? "bg-emerald-600 text-white shadow-xl shadow-emerald-200 translate-x-1" 
                : "bg-white/60 backdrop-blur-md text-gray-600 hover:bg-white hover:shadow-md border border-gray-100/50"
            )}
          >
            <FileText className={cn("w-5 h-5 transition-transform group-hover:scale-110", activeTab === 'reports' ? "text-white" : "text-emerald-600")} />
            <span>Intelligence</span>
            {activeTab === 'reports' && (
              <div className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-white rounded-full transition-all duration-500" />
            )}
          </button>

          <div className="lg:mt-8 pt-8 border-t border-gray-100 hidden lg:block px-4">
             <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">System</h2>
          </div>

          <button 
            onClick={() => setActiveTab('system')}
            className={cn(
              "flex-shrink-0 flex items-center gap-3 px-6 py-4 rounded-2xl transition-all duration-300 font-bold group relative overflow-hidden text-sm",
              activeTab === 'system' 
                ? "bg-gray-900 text-white shadow-xl shadow-gray-200 translate-x-1" 
                : "bg-white/60 backdrop-blur-md text-gray-600 hover:bg-white hover:shadow-md border border-gray-100/50"
            )}
          >
            <Settings className={cn("w-5 h-5 transition-all group-hover:rotate-90 duration-500", activeTab === 'system' ? "text-white" : "text-gray-400")} />
            <span>Configuration</span>
            {activeTab === 'system' && (
              <div className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-white rounded-full transition-all duration-500" />
            )}
          </button>

          <div className="mt-auto hidden lg:block pt-6 border-t border-gray-100">
             <button onClick={() => navigate('/')} className="flex items-center gap-3 px-4 py-3 text-gray-500 hover:text-emerald-600 transition-colors w-full">
                <ArrowLeft className="w-5 h-5" />
                <span>Exit Admin</span>
             </button>
          </div>
        </aside>

        {/* Content Area */}
        <div className="flex-1 bg-white/50 backdrop-blur-md rounded-3xl border border-white shadow-xl overflow-hidden min-h-[600px] flex flex-col">
          {isLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center p-12">
               <div className="relative">
                  <div className="w-20 h-20 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin"></div>
                  <Shield className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-emerald-600" />
               </div>
               <p className="mt-4 text-gray-500 font-medium">Loading control center...</p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col">
              
              {/* Tab Header with Search */}
              <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                 <div>
                    <h2 className="text-2xl font-bold text-gray-900 capitalize">{activeTab}</h2>
                    <p className="text-sm text-gray-500">System management and logs</p>
                 </div>
                 {activeTab !== 'overview' && activeTab !== 'system' && (
                   <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input 
                        type="text" 
                        placeholder={`Search ${activeTab}...`}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 pr-4 py-2 rounded-xl bg-gray-100 border-none focus:ring-2 focus:ring-emerald-500 w-full sm:w-64 text-sm"
                      />
                   </div>
                 )}
              </div>

              {/* Tab Panels */}
              <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
                
                {/* Overview Tab */}
                {activeTab === 'overview' && (
                  <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                        {/* Users Card */}
                        <div className="group relative p-8 rounded-[2rem] bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-2xl shadow-blue-200/50 hover:-translate-y-2 transition-all duration-500 overflow-hidden">
                           <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-48 h-48 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-colors" />
                           <div className="relative z-10">
                              <div className="flex justify-between items-start mb-6">
                                 <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-xl flex items-center justify-center border border-white/30 shadow-inner group-hover:scale-110 transition-transform">
                                    <User className="w-8 h-8" />
                                 </div>
                                 <div className="flex flex-col items-end">
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-100/80 mb-1">Ecosystem</span>
                                    <div className="px-2 py-0.5 rounded-full bg-emerald-400/20 border border-emerald-400/30 text-[10px] font-bold text-emerald-300">LIVE</div>
                                 </div>
                              </div>
                              <div className="space-y-1">
                                 <p className="text-5xl font-black tracking-tight">{stats?.totalUsers || 0}</p>
                                 <p className="text-sm text-blue-100 font-medium tracking-wide">Registered Personnel</p>
                              </div>
                           </div>
                        </div>

                        {/* Groups Card */}
                        <div className="group relative p-8 rounded-[2rem] bg-gradient-to-br from-emerald-500 to-teal-700 text-white shadow-2xl shadow-emerald-200/50 hover:-translate-y-2 transition-all duration-500 overflow-hidden">
                           <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-48 h-48 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-colors" />
                           <div className="relative z-10">
                              <div className="flex justify-between items-start mb-6">
                                 <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-xl flex items-center justify-center border border-white/30 shadow-inner group-hover:scale-110 transition-transform">
                                    <Users className="w-8 h-8" />
                                 </div>
                                 <div className="flex flex-col items-end">
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-100/80 mb-1">Collaboration</span>
                                    <div className="px-2 py-0.5 rounded-full bg-white/20 border border-white/30 text-[10px] font-bold">ACTIVE</div>
                                 </div>
                              </div>
                              <div className="space-y-1">
                                 <p className="text-5xl font-black tracking-tight">{stats?.totalGroups || 0}</p>
                                 <p className="text-sm text-emerald-100 font-medium tracking-wide">Business Units</p>
                              </div>
                           </div>
                        </div>

                        {/* System Card */}
                        <div className={cn(
                          "group relative p-8 rounded-[2rem] text-white shadow-2xl transition-all duration-500 overflow-hidden hover:-translate-y-2",
                          stats?.maintenanceMode 
                            ? "bg-gradient-to-br from-amber-500 to-orange-600 shadow-amber-200/50" 
                            : "bg-gradient-to-br from-gray-800 to-black shadow-gray-400/30"
                        )}>
                           <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-48 h-48 bg-white/5 rounded-full blur-3xl group-hover:bg-white/10 transition-colors" />
                           <div className="relative z-10">
                              <div className="flex justify-between items-start mb-6">
                                 <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-xl flex items-center justify-center border border-white/20 shadow-inner group-hover:rotate-12 transition-transform">
                                    <Lock className="w-8 h-8" />
                                 </div>
                                 <div className="flex flex-col items-end">
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-1">Reliability</span>
                                    <div className={cn(
                                       "px-2 py-0.5 rounded-full border text-[10px] font-bold",
                                       stats?.maintenanceMode ? "bg-amber-400/20 border-white/30" : "bg-emerald-400/10 border-emerald-500/20 text-emerald-400"
                                    )}>
                                       {stats?.maintenanceMode ? 'LOCKED' : 'SECURE'}
                                    </div>
                                 </div>
                              </div>
                              <div className="space-y-1">
                                 <p className="text-5xl font-black tracking-tight uppercase">{stats?.maintenanceMode ? 'RESTRICT' : 'READY'}</p>
                                 <p className="text-sm text-gray-300 font-medium tracking-wide">Environment Status</p>
                              </div>
                           </div>
                        </div>
                    </div>

                    <div className="grid lg:grid-cols-2 gap-10">
                        {/* Recent Tickets Section */}
                        <div className="bg-white/80 backdrop-blur-sm rounded-[2.5rem] border border-gray-100 p-8 shadow-sm hover:shadow-xl transition-all duration-500">
                           <div className="flex justify-between items-center mb-8">
                              <h3 className="text-xl font-black text-gray-900 flex items-center gap-3">
                                 <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                                    <Clock className="w-6 h-6" />
                                 </div>
                                 Support Flux
                              </h3>
                              <button onClick={() => setActiveTab('tickets')} className="text-xs font-bold text-emerald-600 hover:text-emerald-700 hover:underline transition-colors uppercase tracking-widest">View All</button>
                           </div>
                           <div className="space-y-4">
                              {tickets.slice(0, 5).map(t => (
                                <div key={t.id} className="group flex items-center justify-between p-4 rounded-3xl hover:bg-gray-50/80 transition-all cursor-pointer border border-transparent hover:border-gray-100" onClick={() => setActiveTab('tickets')}>
                                   <div className="flex items-center gap-4">
                                      <div className="w-12 h-12 rounded-2xl bg-white border border-gray-100 flex items-center justify-center text-blue-600 shadow-sm group-hover:scale-105 transition-transform">
                                         <MessageCircle className="w-6 h-6" />
                                      </div>
                                      <div>
                                         <p className="text-sm font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{t.userName}</p>
                                         <p className="text-xs text-gray-400 truncate w-32 sm:w-64 font-medium">{t.subject}</p>
                                      </div>
                                   </div>
                                   <div className="text-right">
                                      <span className={cn(
                                        "text-[10px] px-3 py-1 rounded-full font-black border uppercase tracking-wider",
                                        t.status === 'open' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                      )}>
                                        {t.status}
                                      </span>
                                      <p className="text-[10px] text-gray-400 mt-2 font-bold">{new Date(t.updatedAt).toLocaleDateString()}</p>
                                   </div>
                                </div>
                              ))}
                              {tickets.length === 0 && (
                                <div className="py-12 text-center">
                                   <MessageCircle className="w-12 h-12 text-gray-100 mx-auto mb-3" />
                                   <p className="text-gray-400 text-sm font-medium italic">No active support requests.</p>
                                </div>
                              )}
                           </div>
                        </div>

                        {/* Recent Activity Section */}
                        <div className="bg-white/80 backdrop-blur-sm rounded-[2.5rem] border border-gray-100 p-8 shadow-sm hover:shadow-xl transition-all duration-500">
                           <div className="flex justify-between items-center mb-8">
                              <h3 className="text-xl font-black text-gray-900 flex items-center gap-3">
                                 <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-red-600">
                                    <Activity className="w-6 h-6" />
                                 </div>
                                 System Pulse
                              </h3>
                              <div className="flex items-center gap-2">
                                 <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                 <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Real-time</span>
                              </div>
                           </div>
                           
                           <div className="relative space-y-8 before:absolute before:inset-0 before:ml-6 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gray-100 before:to-transparent">
                              {/* New User Event */}
                              <div className="relative flex items-center gap-6 group">
                                 <div className="absolute left-0 w-12 h-12 flex items-center justify-center bg-white rounded-2xl border border-gray-100 shadow-sm z-10 group-hover:border-blue-200 transition-colors">
                                    <UserPlus className="w-5 h-5 text-blue-500" />
                                 </div>
                                 <div className="ml-16">
                                    <p className="text-sm font-bold text-gray-900">Personnel Acquisition</p>
                                    <p className="text-xs text-gray-500 mt-0.5">New operative synchronized to ledger.</p>
                                    <p className="text-[10px] text-gray-400 mt-2 font-bold uppercase tracking-wider flex items-center gap-1">
                                       <Clock className="w-3 h-3" />
                                       2 Hours Ago
                                    </p>
                                 </div>
                              </div>

                              {/* Backup Event */}
                              <div className="relative flex items-center gap-6 group">
                                 <div className="absolute left-0 w-12 h-12 flex items-center justify-center bg-white rounded-2xl border border-gray-100 shadow-sm z-10 group-hover:border-emerald-200 transition-colors">
                                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                 </div>
                                 <div className="ml-16">
                                    <p className="text-sm font-bold text-gray-900">Sector Initialization</p>
                                    <p className="text-xs text-gray-500 mt-0.5">Unit "{groups[0]?.name || "Core"}" activity logged.</p>
                                    <p className="text-[10px] text-gray-400 mt-2 font-bold uppercase tracking-wider flex items-center gap-1">
                                       <Clock className="w-3 h-3" />
                                       5 Hours Ago
                                    </p>
                                 </div>
                              </div>

                              {/* Maintenance Event */}
                              <div className="relative flex items-center gap-6 group opacity-60">
                                 <div className="absolute left-0 w-12 h-12 flex items-center justify-center bg-white rounded-2xl border border-gray-100 shadow-sm z-10">
                                    <Lock className="w-5 h-5 text-gray-400" />
                                 </div>
                                 <div className="ml-16">
                                    <p className="text-sm font-bold text-gray-900">Policy Synchronization</p>
                                    <p className="text-xs text-gray-500 mt-0.5">{stats?.maintenanceMode ? "Lockdown active." : "Systems stable."}</p>
                                    <p className="text-[10px] text-gray-400 mt-2 font-bold uppercase tracking-wider flex items-center gap-1">
                                       <Clock className="w-3 h-3" />
                                       Yesterday
                                    </p>
                                 </div>
                              </div>
                           </div>
                        </div>
                    </div>
                  </div>
                )}

                {/* Users Tab */}
                {activeTab === 'users' && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                     <div className="bg-white/80 backdrop-blur-md rounded-[2.5rem] border border-gray-100 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500">
                        <div className="overflow-x-auto">
                           <table className="w-full text-left">
                              <thead className="bg-gray-50/50 border-b border-gray-100">
                                  <tr>
                                     <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Security Identity</th>
                                     <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 hidden md:table-cell">Capital & Vector</th>
                                     <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Integrity State</th>
                                     <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 text-right">Directives</th>
                                  </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-50/50">
                                 {filteredUsers.map(u => (
                                   <tr key={u.uid} className="group hover:bg-gray-50/30 transition-all duration-300">
                                      <td className="px-8 py-6">
                                         <div className="flex items-center gap-4 cursor-pointer" onClick={() => setSelectedUser(u)}>
                                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-white to-gray-50 border border-gray-100 flex items-center justify-center text-emerald-600 font-black text-xl shadow-sm group-hover:scale-110 group-hover:rotate-3 transition-transform relative">
                                               {u.displayName.charAt(0)}
                                               {u.role === 'admin' && (
                                                  <div className="absolute -top-2 -right-2 bg-black text-white p-1 rounded-lg shadow-lg">
                                                     <Shield className="w-3 h-3" />
                                                  </div>
                                               )}
                                            </div>
                                            <div className="flex flex-col">
                                               <span className="font-black text-gray-900 group-hover:text-emerald-600 transition-colors uppercase tracking-tight">{u.displayName}</span>
                                               <span className="text-xs text-gray-400 font-medium tracking-wide">{u.email}</span>
                                            </div>
                                         </div>
                                      </td>
                                      <td className="px-8 py-6 hidden md:table-cell">
                                         <div className="flex flex-col gap-2">
                                            <span className="text-[10px] font-black px-3 py-1 rounded-xl bg-gray-100/50 w-fit text-gray-500 border border-gray-200/50 uppercase tracking-tighter" title={u.uid}>HEX: {u.uid?.substring(0, 12)}</span>
                                            <div className="flex items-center gap-2">
                                               <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center text-amber-600">
                                                  <Zap className="w-4 h-4" />
                                               </div>
                                               <span className="text-sm font-black text-gray-900">{formatAmount(u.walletBalance)}</span>
                                            </div>
                                         </div>
                                      </td>
                                      <td className="px-8 py-6">
                                         <span className={cn(
                                           "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.15em] border transition-all",
                                           u.accountStatus === 'active' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : 
                                           u.accountStatus === 'banned' ? "bg-red-50 text-red-600 border-red-100" : "bg-gray-50 text-gray-500 border-gray-100"
                                         )}>
                                           {u.accountStatus}
                                         </span>
                                      </td>
                                      <td className="px-8 py-6 text-right">
                                         <div className="flex items-center justify-end gap-2">
                                            {isActionLoading === u.uid ? (
                                              <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
                                            ) : (
                                              <TooltipProvider>
                                                 <Tooltip>
                                                   <TooltipTrigger asChild>
                                                     <button
                                                       aria-label="Protocol Breakdown"
                                                       onClick={() => setSelectedUser(u)}
                                                       className="w-10 h-10 rounded-xl bg-white border border-gray-100 text-gray-400 hover:text-blue-600 hover:border-blue-100 hover:shadow-lg hover:shadow-blue-100 transition-all flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                                                     >
                                                       <Info className="w-5 h-5" />
                                                     </button>
                                                   </TooltipTrigger>
                                                   <TooltipContent className="z-[110]">
                                                     <p>Protocol Breakdown</p>
                                                   </TooltipContent>
                                                 </Tooltip>
                                                 <Tooltip>
                                                   <TooltipTrigger asChild>
                                                     <button
                                                       aria-label="Liquidate Wallet"
                                                       onClick={() => handleResetUserWallet(u.uid)}
                                                       className="w-10 h-10 rounded-xl bg-white border border-gray-100 text-gray-400 hover:text-emerald-600 hover:border-emerald-100 hover:shadow-lg hover:shadow-emerald-100 transition-all flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                                                     >
                                                       <RefreshCw className="w-5 h-5" />
                                                     </button>
                                                   </TooltipTrigger>
                                                   <TooltipContent className="z-[110]">
                                                     <p>Liquidate Wallet</p>
                                                   </TooltipContent>
                                                 </Tooltip>
                                                 <Tooltip>
                                                   <TooltipTrigger asChild>
                                                     <button
                                                       aria-label={u.accountStatus === 'active' ? 'Revoke Access' : 'Authorize Access'}
                                                       onClick={() => handleUpdateUserStatus(u.uid, u.accountStatus === 'active' ? 'banned' : 'active')}
                                                       className={cn(
                                                         "w-10 h-10 rounded-xl border transition-all flex items-center justify-center focus-visible:outline-none focus-visible:ring-2",
                                                         u.accountStatus === 'active' ? "bg-white border-gray-100 text-gray-400 hover:text-red-600 hover:border-red-100 hover:shadow-lg hover:shadow-red-100 focus-visible:ring-red-500" : "bg-white border-gray-100 text-gray-400 hover:text-emerald-600 hover:border-emerald-100 hover:shadow-lg hover:shadow-emerald-100 focus-visible:ring-emerald-500"
                                                       )}
                                                     >
                                                       {u.accountStatus === 'active' ? <Lock className="w-5 h-5" /> : <Shield className="w-5 h-5" />}
                                                     </button>
                                                   </TooltipTrigger>
                                                   <TooltipContent className="z-[110]">
                                                     <p>{u.accountStatus === 'active' ? 'Revoke Access' : 'Authorize Access'}</p>
                                                   </TooltipContent>
                                                 </Tooltip>
                                              </TooltipProvider>
                                            )}
                                         </div>
                                      </td>
                                   </tr>
                                 ))}
                              </tbody>
                           </table>
                        </div>
                        {filteredUsers.length === 0 && (
                          <div className="p-20 text-center">
                             <div className="w-20 h-20 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-6 text-gray-300">
                                <Users className="w-10 h-10" />
                             </div>
                             <p className="text-gray-400 text-lg font-bold uppercase tracking-widest italic">Zero Personnel Detected</p>
                          </div>
                        )}
                     </div>
                  </div>
                )}

                {/* Groups Tab */}
                {activeTab === 'groups' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {filteredGroups.map(g => (
                      <div key={g.id} className="bg-white/80 backdrop-blur-md rounded-[3rem] border border-gray-100 p-8 flex flex-col shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 relative overflow-hidden group">
                         {/* Subtle background glow */}
                         <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/5 rounded-full blur-3xl group-hover:bg-emerald-500/10 transition-all duration-700" />
                         
                         <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-4 group-hover:translate-x-0">
                            <button 
                              onClick={() => setDetailedGroup(g)}
                              className="w-12 h-12 rounded-2xl bg-black text-white hover:bg-emerald-600 shadow-xl shadow-black/10 transition-all flex items-center justify-center active:scale-95"
                            >
                               <Settings className="w-5 h-5" />
                            </button>
                         </div>
                         <div className="flex items-center gap-6 mb-8 cursor-pointer" onClick={() => setDetailedGroup(g)}>
                            <div className="text-4xl bg-white w-20 h-20 rounded-[2rem] flex items-center justify-center border border-gray-100 shadow-sm group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 group-hover:shadow-xl group-hover:shadow-emerald-100">
                               {g.emoji}
                            </div>
                            <div className="flex flex-col">
                               <h3 className="text-xl font-black text-gray-900 group-hover:text-emerald-600 transition-colors uppercase tracking-tight">{g.name}</h3>
                               <div className="flex items-center gap-2 mt-1">
                                  <Users className="w-3.5 h-3.5 text-gray-400" />
                                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{g.memberCount} Personnel</span>
                               </div>
                            </div>
                         </div>
                         
                         <div className="mt-auto space-y-4 pt-6 border-t border-gray-50/50">
                            <div className="flex justify-between items-center bg-gray-50/50 p-4 rounded-2xl border border-gray-100/50">
                               <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Created Protocol</span>
                               <span className="text-[10px] font-black text-gray-900 uppercase">{new Date(g.createdAt).toLocaleDateString()}</span>
                            </div>
                            
                            <div className="flex items-center justify-between px-2">
                               <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic">Identity Vector: {g.id?.substring(0, 12).toUpperCase()}</span>
                               <div className="w-2 h-2 rounded-full bg-emerald-500" />
                            </div>
                         </div>
                      </div>
                    ))}
                    {filteredGroups.length === 0 && (
                      <div className="col-span-full py-32 text-center bg-white/50 backdrop-blur-sm rounded-[3rem] border border-dashed border-gray-200">
                         <div className="w-20 h-20 rounded-full bg-white shadow-sm flex items-center justify-center mx-auto mb-6 text-gray-200">
                            <Users className="w-10 h-10" />
                         </div>
                         <p className="text-gray-400 text-lg font-bold uppercase tracking-widest italic">Consortium Not Found</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Tickets Tab */}
                {activeTab === 'tickets' && (
                   <div className="grid lg:grid-cols-3 gap-10 animate-in fade-in slide-in-from-bottom-4 duration-700 h-full max-h-[850px]">
                      {/* Ticket List */}
                      <div className="lg:col-span-1 border border-gray-100 rounded-[3rem] overflow-hidden flex flex-col bg-white/50 backdrop-blur-md shadow-sm">
                         <div className="p-8 bg-white border-b border-gray-100">
                            <div className="flex items-center justify-between mb-6">
                               <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Active Inquiries</h3>
                               <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                  <MessageSquare className="w-5 h-5" />
                               </div>
                            </div>
                            <div className="relative group">
                               <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                                  <Filter className="w-4 h-4 text-gray-400 group-hover:text-emerald-500 transition-colors" />
                               </div>
                               <select 
                                 value={statusFilter}
                                 onChange={(e) => setStatusFilter(e.target.value)}
                                 className="w-full pl-12 pr-4 py-4 bg-gray-50 border-none rounded-2xl text-[10px] font-black uppercase tracking-widest focus:ring-2 focus:ring-emerald-500/20 cursor-pointer appearance-none transition-all"
                               >
                                 <option value="all">Protocol: All States</option>
                                 <option value="open">Protocol: Open</option>
                                 <option value="in_progress">Protocol: Processing</option>
                                 <option value="resolved">Protocol: Resolved</option>
                                 <option value="closed">Protocol: Archived</option>
                               </select>
                            </div>
                         </div>
                         <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                            {filteredTickets.map(t => (
                              <button 
                                key={t.id}
                                onClick={() => setSelectedTicket(t)}
                                className={cn(
                                  "w-full p-6 rounded-[2rem] text-left transition-all duration-500 border group",
                                  selectedTicket?.id === t.id 
                                    ? "bg-black border-black shadow-2xl shadow-black/20 translate-x-2" 
                                    : "bg-white border-transparent hover:border-gray-100 hover:shadow-xl hover:shadow-gray-100 hover:-translate-y-1"
                                )}
                              >
                                 <div className="flex justify-between items-start mb-4">
                                    <span className={cn(
                                       "text-[9px] font-black uppercase tracking-widest",
                                       selectedTicket?.id === t.id ? "text-emerald-400" : "text-emerald-600"
                                    )}>{t.ticketNumber || `TKT-${t.id?.substring(0, 6)}`}</span>
                                    <span className={cn(
                                       "text-[8px] font-black uppercase px-3 py-1 rounded-full whitespace-nowrap backdrop-blur-md border",
                                       t.status === 'open' ? "bg-amber-100/50 text-amber-600 border-amber-200/50" : 
                                       t.status === 'replied' ? "bg-blue-100/50 text-blue-600 border-blue-200/50" :
                                       t.status === 'resolved' ? "bg-emerald-100/50 text-emerald-600 border-emerald-200/50" :
                                       "bg-gray-100/50 text-gray-600 border-gray-200/50"
                                    )}>{t.status?.replace('_', ' ')}</span>
                                 </div>
                                 <p className={cn(
                                   "text-sm font-black truncate tracking-tight transition-colors",
                                   selectedTicket?.id === t.id ? "text-white" : "text-gray-900"
                                 )}>{t.userName}</p>
                                 <p className={cn(
                                   "text-xs truncate mt-2 font-medium transition-colors",
                                   selectedTicket?.id === t.id ? "text-gray-400" : "text-gray-500"
                                 )}>{t.subject}</p>
                                 
                                 <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-50/10">
                                    <div className={cn(
                                       "flex items-center gap-2 text-[8px] font-black uppercase tracking-widest",
                                       selectedTicket?.id === t.id ? "text-gray-500" : "text-gray-400"
                                    )}>
                                       <Clock className="w-3.5 h-3.5" />
                                       {new Date(t.updatedAt).toLocaleDateString()}
                                    </div>
                                    <div className={cn(
                                       "flex items-center gap-1 px-2 py-0.5 rounded-md",
                                       t.priority === 'high' ? 'bg-red-500/10 text-red-500' : 'bg-emerald-500/10 text-emerald-500',
                                       selectedTicket?.id === t.id && 'bg-white/10'
                                    )}>
                                       <div className={cn(
                                          "w-1.5 h-1.5 rounded-full shrink-0",
                                          t.priority === 'high' ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'
                                       )} />
                                       <span className="text-[8px] font-black uppercase">{t.priority}</span>
                                    </div>
                                 </div>
                              </button>
                            ))}
                         </div>
                      </div>

                      {/* Ticket Detail */}
                      <div className="lg:col-span-2 border border-gray-100 rounded-[3rem] overflow-hidden flex flex-col bg-white shadow-2xl shadow-gray-200/50">
                         {selectedTicket ? (
                           <>
                              <div className="p-10 border-b border-gray-100/50 flex flex-col sm:flex-row justify-between items-start gap-6">
                                 <div className="flex-1">
                                    <div className="flex flex-wrap items-center gap-3 mb-4">
                                       <h3 className="text-2xl font-black text-gray-900 tracking-tight">{selectedTicket.subject}</h3>
                                       <div className="flex items-center gap-1.5 p-1.5 bg-gray-50 rounded-2xl border border-gray-100">
                                          <button 
                                             onClick={() => handleUpdateTicketStatus('open')}
                                             className={cn(
                                                "px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all",
                                                selectedTicket.status === 'open' ? "bg-amber-100 text-amber-700 border border-amber-200" : "text-gray-400 hover:text-amber-600 hover:bg-amber-50"
                                             )}
                                          >
                                             Open
                                          </button>
                                          <button 
                                             onClick={() => handleUpdateTicketStatus('replied')}
                                             className={cn(
                                                "px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all",
                                                selectedTicket.status === 'replied' ? "bg-blue-100 text-blue-700 border border-blue-200" : "text-gray-400 hover:text-blue-600 hover:bg-blue-50"
                                             )}
                                          >
                                             Assisted
                                          </button>
                                          <button 
                                             onClick={() => handleUpdateTicketStatus('resolved')}
                                             className={cn(
                                                "px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all",
                                                selectedTicket.status === 'resolved' ? "bg-emerald-100 text-emerald-700 border border-emerald-200" : "text-gray-400 hover:text-emerald-600 hover:bg-emerald-50"
                                             )}
                                          >
                                             Resolved
                                          </button>
                                       </div>
                                    </div>
                                    <div className="flex items-center gap-4 flex-wrap">
                                       <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-gray-50 border border-gray-100">
                                          <div className="w-6 h-6 rounded-full bg-white shadow-sm flex items-center justify-center text-[10px] font-bold text-gray-400 border border-gray-100">
                                             <User className="w-3 h-3" />
                                          </div>
                                          <span className="text-[11px] font-black text-gray-700 uppercase tracking-tight">{selectedTicket.userName}</span>
                                       </div>
                                       <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-gray-50 border border-gray-100">
                                          <Mail className="w-3.5 h-3.5 text-gray-400" />
                                          <span className="text-[11px] font-bold text-gray-500 lowercase">{selectedTicket.userEmail}</span>
                                       </div>
                                    </div>
                                 </div>
                                 <button onClick={() => setSelectedTicket(null)} className="lg:hidden p-3 rounded-2xl bg-gray-50 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"><X className="w-6 h-6" /></button>
                              </div> 
                              <div className="flex-1 overflow-y-auto p-10 bg-gray-50/30 space-y-8 custom-scrollbar">
                                 {selectedTicket.messages && Object.entries(selectedTicket.messages).map(([id, msg]: [string, any]) => (
                                   <div key={id} className={cn("flex flex-col", msg.sender === 'admin' ? 'items-end' : 'items-start')}>
                                      <div className={cn(
                                        "max-w-[75%] p-6 rounded-[2.5rem] text-sm shadow-sm transition-all duration-300 hover:shadow-md",
                                        msg.sender === 'admin' 
                                          ? "bg-black text-white rounded-tr-none shadow-black/10" 
                                          : "bg-white text-gray-900 border border-gray-100 rounded-tl-none shadow-gray-200/50"
                                      )}>
                                         <p className="font-semibold leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                                      </div>
                                      <span className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mt-3 px-2">
                                         {msg.sender === 'admin' ? 'Administrative Response' : 'Inbound Query'} • {new Date(msg.timestamp).toLocaleString()}
                                      </span>
                                   </div>
                                 ))}
                                 <div ref={messagesEndRef} />
                              </div>
                              <div className="p-8 bg-white border-t border-gray-100">
                                 <div className="bg-gray-50 p-3 rounded-[2.5rem] border border-gray-100 focus-within:bg-white focus-within:ring-4 focus-within:ring-emerald-500/10 transition-all duration-500">
                                    <div className="flex items-center gap-4">
                                       <input 
                                         type="text" 
                                         placeholder="Draft a tactical response..."
                                         value={replyMessage}
                                         onChange={(e) => setReplyMessage(e.target.value)}
                                         onKeyPress={(e) => e.key === 'Enter' && handleReplyTicket()}
                                         className="flex-1 bg-transparent border-none py-4 px-6 text-sm font-bold placeholder:text-gray-300 placeholder:font-black placeholder:uppercase placeholder:tracking-widest focus:ring-0"
                                       />
                                       <button 
                                         onClick={handleReplyTicket}
                                         disabled={!replyMessage.trim() || isActionLoading === 'reply'}
                                         className="w-14 h-14 bg-emerald-600 text-white rounded-[1.5rem] flex items-center justify-center hover:bg-black hover:scale-105 active:scale-95 transition-all shadow-xl shadow-emerald-200 disabled:opacity-50 disabled:shadow-none disabled:scale-100"
                                       >
                                          {isActionLoading === 'reply' ? <Loader2 className="w-6 h-6 animate-spin" /> : <TrendingUp className="w-6 h-6 rotate-45" />}
                                       </button>
                                    </div>
                                 </div>
                              </div>
                           </>
                         ) : (
                           <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-12 text-center">
                              <MessageSquare className="w-16 h-16 mb-4 opacity-10" />
                              <p className="font-bold text-gray-900">Support Console Idle</p>
                              <p className="text-xs max-w-xs mt-1">Select a communication chain to begin enterprise support intervention.</p>
                           </div>
                         )}
                      </div>
                   </div>
                )}

                {/* Reports Tab */}
                {activeTab === 'reports' && (
                  <div className="space-y-8 animate-in fade-in duration-500 max-w-6xl mx-auto">
                     <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                        <div>
                           <h3 className="text-3xl font-black text-gray-900 tracking-tight uppercase">System Intelligence</h3>
                           <p className="text-sm font-bold text-gray-400 mt-2 uppercase tracking-[0.2em]">Real-time monitoring of security & integrity alerts.</p>
                        </div>
                        <div className="flex items-center gap-4">
                           <div className="px-6 py-3 rounded-[1.5rem] bg-red-50 border border-red-100/50 flex items-center gap-3 shadow-sm shadow-red-100">
                              <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                              <span className="text-[10px] font-black text-red-600 uppercase tracking-widest">{reports.length} Critical Alerts</span>
                           </div>
                        </div>
                     </div>

                     <div className="grid grid-cols-1 gap-6">
                        {filteredReports.map(r => (
                          <div 
                            key={r.id} 
                            onClick={() => setSelectedReport(r)}
                            className="group bg-white rounded-[2.5rem] p-8 border border-gray-100 hover:border-emerald-500/30 hover:shadow-2xl hover:shadow-emerald-200/20 transition-all duration-500 cursor-pointer relative overflow-hidden"
                          >
                             <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-gray-50 to-white -z-10 opacity-50 group-hover:scale-150 transition-transform duration-700" />
                             
                             <div className="flex flex-col lg:flex-row lg:items-center gap-8">
                                <div className="flex items-center gap-6 flex-1">
                                   <div className={cn(
                                      "w-16 h-16 rounded-[1.5rem] flex items-center justify-center text-xl shadow-xl transition-all duration-500 group-hover:scale-110 group-hover:rotate-12",
                                      r.type === 'bug' ? "bg-amber-100 text-amber-600 shadow-amber-100" :
                                      r.type === 'abuse' ? "bg-red-100 text-red-600 shadow-red-100" :
                                      "bg-blue-100 text-blue-600 shadow-blue-100"
                                   )}>
                                      {r.type === 'bug' ? <Zap className="w-8 h-8" /> : 
                                       r.type === 'abuse' ? <Shield className="w-8 h-8" /> : 
                                       <Info className="w-8 h-8" />}
                                   </div>
                                   <div>
                                      <div className="flex items-center gap-3 mb-2">
                                         <h4 className="text-xl font-black text-gray-900 tracking-tight capitalize">{r.type} Report</h4>
                                         <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-3 py-1 bg-gray-50 rounded-xl border border-gray-100">#{r.id?.substring(0, 8)}</span>
                                      </div>
                                      <p className="text-sm font-bold text-gray-500 line-clamp-1 max-w-xl">{r.description}</p>
                                   </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-6 lg:justify-end">
                                   <div className="flex flex-col">
                                      <span className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">Originator</span>
                                      <div className="flex items-center gap-2">
                                         <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-400">
                                            <User className="w-3.5 h-3.5" />
                                         </div>
                                         <span className="text-xs font-black text-gray-700">{r.reporterName}</span>
                                      </div>
                                   </div>

                                   <div className="flex flex-col">
                                      <span className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">Temporal State</span>
                                      <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
                                         <Clock className="w-3.5 h-3.5" />
                                         {new Date(r.createdAt).toLocaleDateString()}
                                      </div>
                                   </div>

                                   <div className={cn(
                                      "px-4 py-2 rounded-2xl text-[9px] font-black uppercase tracking-widest border transition-all",
                                      r.status === 'pending' ? "bg-amber-50 text-amber-600 border-amber-100" : "bg-emerald-50 text-emerald-600 border-emerald-100"
                                   )}>
                                      {r.status}
                                   </div>

                                   <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-300 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-500 shadow-inner">
                                      <ChevronRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                                   </div>
                                </div>
                             </div>
                          </div>
                        ))}

                        {filteredReports.length === 0 && (
                          <div className="py-20 text-center flex flex-col items-center justify-center bg-white rounded-[3rem] border border-gray-100 shadow-sm">
                             <div className="w-24 h-24 rounded-[2.5rem] bg-emerald-50 flex items-center justify-center mb-8">
                                <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                             </div>
                             <h4 className="text-xl font-black text-gray-900 uppercase tracking-tight mb-2">Omniscient Integrity</h4>
                             <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">No unresolved transmissions detected in the security perimeter.</p>
                          </div>
                        )}
                     </div>
                  </div>
                )}

                {/* System Tab */}
                {activeTab === 'system' && (
                  <div className="space-y-8 animate-in fade-in duration-300">
                     <div className="bg-white border border-gray-100 rounded-3xl p-8 shadow-sm">
                        <div className="flex items-center gap-4 mb-8">
                           <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-600">
                              <Zap className="w-6 h-6" />
                           </div>
                           <div>
                              <h3 className="text-xl font-bold text-gray-900">Global Broadcast Engine</h3>
                              <p className="text-sm text-gray-500">Dispatch critical notifications to the entire user base.</p>
                           </div>
                        </div>
                        <div className="space-y-4 max-w-2xl">
                           <div>
                              <label className="block text-xs font-bold text-gray-500 uppercase mb-2 ml-1">Directive Subject</label>
                              <input 
                                type="text"
                                value={broadcastTitle}
                                onChange={(e) => setBroadcastTitle(e.target.value)}
                                placeholder="E.g. Security Update Protocol v2.5"
                                className="w-full bg-gray-50 border-gray-100 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 border"
                              />
                           </div>
                           <div>
                              <label className="block text-xs font-bold text-gray-500 uppercase mb-2 ml-1">Payload Content</label>
                              <textarea 
                                rows={4}
                                value={broadcastMessage}
                                onChange={(e) => setBroadcastMessage(e.target.value)}
                                placeholder="Full communication text goes here..."
                                className="w-full bg-gray-50 border-gray-100 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 border resize-none"
                              />
                           </div>
                           <button 
                             onClick={handleBroadcast}
                             disabled={isActionLoading === 'broadcast'}
                             className="bg-black text-white px-8 py-3 rounded-2xl font-bold hover:bg-gray-800 transition-all shadow-xl shadow-gray-200 disabled:opacity-50 flex items-center gap-2"
                           >
                              {isActionLoading === 'broadcast' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                              Fire Directive
                           </button>
                        </div>
                     </div>

                     <div className="grid sm:grid-cols-2 gap-8">
                        <div className="bg-white border border-gray-100 rounded-3xl p-8 shadow-sm flex flex-col items-start">
                           <div className="w-12 h-12 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-600 mb-6">
                              <LockKeyhole className="w-6 h-6" />
                           </div>
                           <h3 className="text-xl font-bold text-gray-900 mb-2">Service Lockdown</h3>
                           <p className="text-sm text-gray-500 mb-6">Suspend all standard transactions and access for essential system upgrades.</p>
                           <button 
                             onClick={() => handleToggleMaintenance(!stats?.maintenanceMode)}
                             className={cn(
                               "px-6 py-2 rounded-xl font-bold transition-all",
                               stats?.maintenanceMode ? "bg-red-600 text-white shadow-lg shadow-red-200" : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                             )}
                           >
                              {stats?.maintenanceMode ? 'Terminate Lockdown' : 'Initiate Lockdown'}
                           </button>
                        </div>

                        <div className="bg-white border border-gray-100 rounded-3xl p-8 shadow-sm flex flex-col items-start translate">
                           <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-600 mb-6">
                              <History className="w-6 h-6" />
                           </div>
                           <h3 className="text-xl font-bold text-gray-900 mb-2">Audit Synchronization</h3>
                           <p className="text-sm text-gray-500 mb-6">Review raw internal chronologies and security access logs.</p>
                           <button onClick={() => toast.info("Audit logs restricted to Level 5 clearance (SuperAdmin).")} className="px-6 py-2 rounded-xl bg-gray-100 text-gray-600 font-bold hover:bg-gray-200 transition-all">
                              Request Decryption
                           </button>
                        </div>
                     </div>
                  </div>
                )}

              </div>
            </div>
          )}
        </div>
      </main>

      {/* --- MODALS --- */}

      {/* User Detail Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in" onClick={() => setSelectedUser(null)} />
           <div className="bg-white rounded-[2rem] w-full max-w-xl relative overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
              <div className="p-8 pb-0 flex justify-between items-start">
                 <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-3xl bg-emerald-100 flex items-center justify-center text-2xl font-black text-emerald-600">
                       {selectedUser.displayName.charAt(0)}
                    </div>
                    <div>
                       <h3 className="text-2xl font-bold text-gray-900">{selectedUser.displayName}</h3>
                       <p className="text-sm text-gray-500 font-medium">{selectedUser.email}</p>
                    </div>
                 </div>
                 <button onClick={() => setSelectedUser(null)} className="p-2 rounded-full hover:bg-gray-100 text-gray-400">
                    <X className="w-6 h-6" />
                 </button>
              </div>

              <div className="p-8 overflow-y-auto space-y-8">
                 <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100">
                       <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Identity UID</p>
                       <p className="text-xs font-mono font-bold text-gray-700 truncate">{selectedUser.uid}</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100">
                       <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Access Level</p>
                       <p className="text-xs font-bold text-gray-900 uppercase">{selectedUser.role}</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100">
                       <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Provisioned</p>
                       <p className="text-xs font-bold text-gray-900">{new Date(selectedUser.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100">
                       <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Last Protocol Session</p>
                       <p className="text-xs font-bold text-gray-900">{new Date(selectedUser.lastSignIn).toLocaleDateString()}</p>
                    </div>
                 </div>

                 <div className="space-y-4">
                    <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                       <Shield className="w-4 h-4 text-emerald-600" />
                       Intervention Controls
                    </h4>
                    <div className="space-y-3">
                       <div className="flex items-center gap-3">
                          <input 
                            type="text" 
                            placeholder="New override password..."
                            value={passwordResetValue}
                            onChange={(e) => setPasswordResetValue(e.target.value)}
                            className="flex-1 bg-gray-50 border-gray-100 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-emerald-500 border"
                          />
                          <button 
                            onClick={() => handleResetUserPassword(selectedUser.uid)}
                            disabled={isActionLoading === 'password'}
                            className="px-4 py-2 bg-black text-white rounded-xl text-xs font-bold hover:bg-gray-800 disabled:opacity-50"
                          >
                             {isActionLoading === 'password' ? 'Resetting...' : 'Force Reset'}
                          </button>
                       </div>
                       
                       <div className="flex items-center gap-3 pt-2">
                          <button 
                            onClick={() => handleUpdateUserStatus(selectedUser.uid, selectedUser.accountStatus === 'active' ? 'banned' : 'active')}
                            className={cn(
                              "flex-1 py-3 rounded-2xl font-bold text-sm transition-all",
                              selectedUser.accountStatus === 'active' ? "bg-red-50 text-red-600 hover:bg-red-100" : "bg-emerald-600 text-white"
                            )}
                          >
                             {selectedUser.accountStatus === 'active' ? 'Suspend Account' : 'Reactive Account'}
                          </button>
                          <button 
                            onClick={() => handleDeleteUser(selectedUser.uid)}
                            className="px-6 py-3 bg-gray-100 text-gray-400 hover:bg-black hover:text-white rounded-2xl font-bold text-sm transition-all"
                          >
                             Purge Data
                          </button>
                       </div>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Group Detailed Management Modal */}
      {detailedGroup && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in" onClick={() => setDetailedGroup(null)} />
           <div className="bg-white rounded-[2rem] w-full max-w-2xl relative overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
              <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                 <div className="flex items-center gap-4">
                    <div className="text-4xl">{detailedGroup.emoji}</div>
                    <div>
                       <h3 className="text-2xl font-bold text-gray-900">{detailedGroup.name}</h3>
                       <p className="text-xs text-gray-400 font-mono italic">Operational Sector ID: {detailedGroup.id}</p>
                    </div>
                 </div>
                 <button onClick={() => setDetailedGroup(null)} className="p-2 rounded-full hover:bg-white text-gray-400 shadow-sm">
                    <X className="w-6 h-6" />
                 </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-8">
                 <div className="space-y-4">
                    <div className="flex items-center justify-between">
                       <h4 className="text-sm font-bold text-gray-900 uppercase tracking-widest flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          Authorized Personnel ({detailedGroup.memberCount})
                       </h4>
                    </div>
                                       <div className="grid gap-2">
                       {detailedGroup.members ? (
                         // Handle both object and array formats for members
                         (Array.isArray(detailedGroup.members) 
                           ? detailedGroup.members 
                           : Object.keys(detailedGroup.members)
                         ).map(mid => {
                           // If it's an array of objects, extract the UID
                           const memberUid = typeof mid === 'object' ? (mid.uid || mid.id || (mid as any).userId) : mid;
                           const mUser = users.find(u => u.uid === memberUid);
                           return (
                             <div key={memberUid} className="px-4 py-3 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-between group/item">
                                <div className="flex items-center gap-3">
                                   <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-xs font-bold text-gray-400 border border-gray-200">
                                      {mUser?.displayName?.charAt(0) || '?'}
                                   </div>
                                   <div className="flex flex-col">
                                      <span className="text-sm font-bold text-gray-900">{mUser?.displayName || `Subject ${memberUid?.substring(0, 8)}`}</span>
                                      <span className="text-[10px] text-gray-500 font-mono italic">{memberUid || 'No UID'}</span>
                                   </div>
                                </div>
                                <button 
                                  onClick={() => handleRemoveMemberForce(detailedGroup.id, memberUid)}
                                  className="opacity-0 group-hover/item:opacity-100 p-2 text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                >
                                   <Trash2 className="w-4 h-4" />
                                </button>
                             </div>
                           );
                         })
                       ) : (
                         <p className="text-center text-sm text-gray-400 py-8">No active members cataloged.</p>
                       )}
                    </div>
                 </div>

                 <div className="p-6 rounded-3xl bg-red-50 border border-red-100">
                    <h4 className="text-sm font-black text-red-700 uppercase mb-2 flex items-center gap-2">
                       <AlertTriangle className="w-4 h-4" />
                       Danger Zone
                    </h4>
                    <p className="text-xs text-red-600 mb-4 font-medium italic">Terminating this business unit will permanently delete all associated transaction history and collaboration data.</p>
                    <button 
                      onClick={() => handleDeleteGroup(detailedGroup.id)}
                      className="w-full py-3 bg-red-600 text-white rounded-2xl font-bold text-sm hover:bg-red-700 shadow-lg shadow-red-200 transition-all"
                    >
                       Execute Force Deletion
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}
      {/* Report Detail Modal */}
      {selectedReport && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in" onClick={() => setSelectedReport(null)} />
           <div className="bg-white rounded-[2rem] w-full max-w-xl relative overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
              <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-red-50/50">
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-red-100 flex items-center justify-center text-red-600">
                       <AlertTriangle className="w-6 h-6" />
                    </div>
                    <div>
                       <h3 className="text-xl font-bold text-gray-900">Incident Report</h3>
                       <p className="text-xs text-red-600 font-bold uppercase tracking-widest">{selectedReport.type}</p>
                    </div>
                 </div>
                 <button onClick={() => setSelectedReport(null)} className="p-2 rounded-full hover:bg-white text-gray-400 shadow-sm">
                    <X className="w-6 h-6" />
                 </button>
              </div>

              <div className="p-8 space-y-8 overflow-y-auto">
                 <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100">
                       <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Reporter</p>
                       <p className="text-xs font-bold text-gray-900">{selectedReport.reporterName}</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100">
                       <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Status</p>
                       <p className="text-xs font-bold text-gray-900 uppercase">{selectedReport.status}</p>
                    </div>
                 </div>

                 <div className="space-y-4">
                    <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                       <Info className="w-4 h-4 text-emerald-600" />
                       Report Details
                    </h4>
                    <div className="p-6 rounded-2xl bg-gray-50 border border-gray-100 space-y-4">
                       <div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Classification Reason</p>
                          <p className="text-sm font-bold text-gray-900">{(selectedReport as any).reason || 'No specific reason provided'}</p>
                       </div>
                       <div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Extended Narrative</p>
                          <p className="text-sm text-gray-600 leading-relaxed">
                             {(selectedReport as any).details || selectedReport.description || 'No additional details provided for this incident.'}
                          </p>
                       </div>
                    </div>
                 </div>

                 <div className="space-y-4">
                    <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                       <Activity className="w-4 h-4 text-emerald-600" />
                       System References
                    </h4>
                    <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100">
                       <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Target Resource ID</p>
                       <p className="text-xs font-mono font-bold text-gray-700">{(selectedReport as any).targetId || 'N/A'}</p>
                       <p className="text-[10px] text-gray-400 mt-1 italic">Type: {(selectedReport as any).targetType || 'Unknown'}</p>
                    </div>
                 </div>

                 <div className="flex gap-4 pt-4">
                    <button 
                      onClick={() => toast.success("Marked as resolved")}
                      className="flex-1 py-3 bg-black text-white rounded-2xl font-bold text-sm hover:bg-gray-800 transition-all"
                    >
                       Archive & Resolve
                    </button>
                    <button 
                      onClick={() => setSelectedReport(null)}
                      className="px-8 py-3 bg-gray-100 text-gray-600 rounded-2xl font-bold text-sm hover:bg-gray-200 transition-all"
                    >
                       Dismiss
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}

    </div>
  );
};

export default AdminDashboard;
