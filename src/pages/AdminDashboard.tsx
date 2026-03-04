import React, { useState, useEffect } from 'react';
import { useFirebaseAuth } from '../contexts/FirebaseAuthContext';
import {
  Shield,
  Search,
  UserCheck,
  UserX,
  ShieldAlert,
  Loader2,
  Trash2,
  KeyRound,
  Eye,
  EyeOff,
  Activity,
  Users,
  MessageSquareWarning,
  MessageCircle,
  Settings
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminDashboard() {
  const { user, firebaseUser } = useFirebaseAuth();
  const [activeTab, setActiveTab] = useState<'users' | 'groups' | 'reports' | 'tickets' | 'system'>('users');

  // Shared States
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://hostel-ledger-backend.vercel.app';

  // Users Tab State
  const [searchQuery, setSearchQuery] = useState('');
  const [targetUser, setTargetUser] = useState<Record<string, unknown> | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Groups Tab State
  const [groupSearchQuery, setGroupSearchQuery] = useState('');
  const [targetGroup, setTargetGroup] = useState<Record<string, unknown> | null>(null);
  const [memberToRemove, setMemberToRemove] = useState('');

  // System Stats State
  const [stats, setStats] = useState({ totalUsers: 0, totalGroups: 0, maintenanceMode: false });
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');

  // Tickets & Reports State
  const [tickets, setTickets] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [ticketReply, setTicketReply] = useState<{ [id: string]: string }>({});

  const fetchToken = async () => firebaseUser?.getIdToken();

  // --- TAB LOADERS ---
  useEffect(() => {
    if (activeTab === 'system') loadSystemStats();
    if (activeTab === 'tickets') loadTickets();
    if (activeTab === 'reports') loadReports();
  }, [activeTab]);

  // --- USER METHODS ---
  const fetchUser = async () => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    setTargetUser(null);
    setNewPassword('');
    try {
      const token = await fetchToken();
      const response = await fetch(`${API_BASE_URL}/api/admin/users/${encodeURIComponent(searchQuery)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) {
        if (response.status === 404) throw new Error('User not found in Authentication Database.');
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch user');
      }
      setTargetUser(await response.json());
    } catch (error: unknown) {
      toast.error(error.message || 'Error finding user');
    } finally {
      setLoading(false);
    }
  };

  const updateUserStatus = async (newStatus: string) => {
    if (!targetUser) return;
    const uid = (targetUser._auth as any)?.uid;
    if (newStatus === 'banned' && !window.confirm(`Ban ${(targetUser._auth as any)?.email}?`)) return;
    setActionLoading(true);
    try {
      const token = await fetchToken();
      const response = await fetch(`${API_BASE_URL}/api/admin/users/${uid}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ status: newStatus })
      });
      if (!response.ok) throw new Error((await response.json()).error || 'Failed to update status');
      toast.success(`User updated to ${newStatus}`);
      await fetchUser();
    } catch (error: unknown) { toast.error(error.message); } finally { setActionLoading(false); }
  };

  const resetUserPassword = async () => {
    if (!targetUser || newPassword.length < 6) return toast.error('Min 6 characters');
    if (!window.confirm('Reset password and revoke sessions?')) return;
    setActionLoading(true);
    try {
      const token = await fetchToken();
      const response = await fetch(`${API_BASE_URL}/api/admin/users/${(targetUser._auth as any)?.uid}/password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ newPassword })
      });
      if (!response.ok) throw new Error((await response.json()).error);
      toast.success('Password reset!');
      setNewPassword('');
    } catch (error: unknown) { toast.error(error.message); } finally { setActionLoading(false); }
  };

  const deleteUser = async () => {
    if (!targetUser) return;
    const email = (targetUser._auth as any)?.email;
    if (window.prompt(`DANGER: Type ${email} to delete:`) !== email) return toast.error('Cancelled');
    setActionLoading(true);
    try {
      const token = await fetchToken();
      const response = await fetch(`${API_BASE_URL}/api/admin/users/${(targetUser._auth as any)?.uid}`, {
        method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error((await response.json()).error);
      toast.success('User deleted.');
      setTargetUser(null);
    } catch (error: unknown) { toast.error(error.message); } finally { setActionLoading(false); }
  };

  const resetUserWallet = async () => {
    if (!targetUser) return;
    if (!window.confirm(`Reset wallet balance to 0 for ${(targetUser._auth as any)?.email}?`)) return;
    setActionLoading(true);
    try {
      const token = await fetchToken();
      const response = await fetch(`${API_BASE_URL}/api/admin/users/${(targetUser._auth as any)?.uid}/wallet-reset`, {
        method: 'POST', headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error((await response.json()).error);
      toast.success('Wallet reset.');
      await fetchUser();
    } catch (error: unknown) { toast.error(error.message); } finally { setActionLoading(false); }
  };

  // --- GROUP METHODS ---
  const fetchGroup = async () => {
    if (!groupSearchQuery.trim()) return;
    setLoading(true);
    setTargetGroup(null);
    try {
      const token = await fetchToken();
      const response = await fetch(`${API_BASE_URL}/api/admin/groups/${encodeURIComponent(groupSearchQuery)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Group not found');
      setTargetGroup(await response.json());
    } catch (error: unknown) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const removeGroupMember = async () => {
    if (!targetGroup || !memberToRemove) return;
    if (!window.confirm(`Remove UID ${memberToRemove} from group ${groupSearchQuery}?`)) return;
    setActionLoading(true);
    try {
      const token = await fetchToken();
      const response = await fetch(`${API_BASE_URL}/api/admin/groups/${groupSearchQuery}/members/${memberToRemove}`, {
        method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error((await response.json()).error);
      toast.success('Member removed');
      setMemberToRemove('');
      await fetchGroup();
    } catch (error: unknown) { toast.error(error.message); } finally { setActionLoading(false); }
  };

  const deleteGroup = async () => {
    if (!targetGroup) return;
    if (window.prompt(`DANGER: Type the group ID to confirm deletion:`) !== groupSearchQuery) return toast.error('Cancelled');
    setActionLoading(true);
    try {
      const token = await fetchToken();
      const response = await fetch(`${API_BASE_URL}/api/admin/groups/${groupSearchQuery}`, {
        method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error((await response.json()).error);
      toast.success('Group deleted.');
      setTargetGroup(null);
      setGroupSearchQuery('');
    } catch (error: unknown) { toast.error(error.message); } finally { setActionLoading(false); }
  };

  // --- SYSTEM METHODS ---
  const loadSystemStats = async () => {
    try {
      const token = await fetchToken();
      const res = await fetch(`${API_BASE_URL}/api/admin/system/stats`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) setStats(await res.json());
    } catch (e) { toast.error('Failed to load stats'); }
  };

  const toggleMaintenance = async () => {
    try {
      const token = await fetchToken();
      const res = await fetch(`${API_BASE_URL}/api/admin/system/maintenance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ enabled: !stats.maintenanceMode })
      });
      if (res.ok) {
        setStats({ ...stats, maintenanceMode: !stats.maintenanceMode });
        toast.success(`Maintenance Mode ${!stats.maintenanceMode ? 'ENABLED' : 'DISABLED'}`);
      }
    } catch (e) { toast.error('Failed to toggle maintenance'); }
  };

  const sendBroadcast = async () => {
    if (!broadcastTitle || !broadcastMessage) return toast.error('Fill all fields');
    setActionLoading(true);
    try {
      const token = await fetchToken();
      const res = await fetch(`${API_BASE_URL}/api/admin/system/broadcast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ title: broadcastTitle, message: broadcastMessage })
      });
      if (res.ok) {
        toast.success('Broadcast sent!');
        setBroadcastTitle('');
        setBroadcastMessage('');
      } else throw new Error();
    } catch (e) { toast.error('Failed to send broadcast'); } finally { setActionLoading(false); }
  };

  // --- TICKET AND REPORT METHODS ---
  const loadTickets = async () => {
    try {
      const token = await fetchToken();
      const res = await fetch(`${API_BASE_URL}/api/admin/tickets`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) setTickets(await res.json());
    } catch (e) { toast.error('Failed to load tickets'); }
  };

  const loadReports = async () => {
    try {
      const token = await fetchToken();
      const res = await fetch(`${API_BASE_URL}/api/admin/reports`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) setReports(await res.json());
    } catch (e) { toast.error('Failed to load reports'); }
  };

  const replyToTicket = async (ticketId: string) => {
    const reply = ticketReply[ticketId];
    if (!reply) return toast.error('Write a reply first');
    setActionLoading(true);
    try {
      const token = await fetchToken();
      const res = await fetch(`${API_BASE_URL}/api/admin/tickets/${ticketId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ adminReply: reply })
      });
      if (res.ok) {
        toast.success('Replied!');
        setTicketReply(prev => ({...prev, [ticketId]: ''}));
        await loadTickets();
      }
    } catch (e) { toast.error('Failed to reply'); } finally { setActionLoading(false); }
  };

  const formatValue = (val: unknown): string => {
    if (val === null || val === undefined) return 'null';
    if (typeof val === 'boolean') return val ? 'Yes/True' : 'No/False';
    if (typeof val === 'object') {
      if (Array.isArray(val)) return `[ ${val.join(', ')} ]`;
      const keys = Object.keys(val);
      if (keys.length === 0) return 'Empty';
      return `Contains ${keys.length} items (Keys: ${keys.slice(0, 5).join(', ')}${keys.length > 5 ? '...' : ''})`;
    }
    return String(val);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-12">
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 sticky top-0 z-10 shadow-sm">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-primary" />
            <h1 className="text-xl font-bold text-gray-900 dark:text-white hidden md:block">Master Admin</h1>
          </div>

          <nav className="flex gap-1 md:gap-2 overflow-x-auto px-2">
            <button onClick={() => setActiveTab('users')} className={`px-3 md:px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${activeTab === 'users' ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'}`}>
              <Users className="w-4 h-4" /> Users
            </button>
            <button onClick={() => setActiveTab('groups')} className={`px-3 md:px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${activeTab === 'groups' ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'}`}>
              <Activity className="w-4 h-4" /> Groups
            </button>
            <button onClick={() => setActiveTab('tickets')} className={`px-3 md:px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${activeTab === 'tickets' ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'}`}>
              <MessageCircle className="w-4 h-4" /> Support
            </button>
            <button onClick={() => setActiveTab('reports')} className={`px-3 md:px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${activeTab === 'reports' ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'}`}>
              <MessageSquareWarning className="w-4 h-4" /> Reports
            </button>
            <button onClick={() => setActiveTab('system')} className={`px-3 md:px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${activeTab === 'system' ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'}`}>
              <Settings className="w-4 h-4" /> System
            </button>
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 md:p-6 mt-4">

        {/* --- USERS TAB --- */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">User Lookup System</h2>
              <div className="flex gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input type="text" placeholder="Search by Email or User ID..." className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg outline-none transition-all dark:text-white" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && fetchUser()} />
                </div>
                <button onClick={fetchUser} disabled={loading || !searchQuery.trim()} className="px-6 py-3 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2 transition-all">
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Lookup'}
                </button>
              </div>
            </div>

            {targetUser && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden animate-in fade-in">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5 text-red-500" /> Administrative Actions
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                    <div className="space-y-3 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                      <h4 className="font-semibold text-sm text-gray-600 dark:text-gray-400 uppercase tracking-wider">Account Status</h4>
                      <div className="flex flex-wrap gap-2">
                        {(targetUser._database as any)?.accountStatus !== 'active' && <button disabled={actionLoading} onClick={() => updateUserStatus('active')} className="px-3 py-2 bg-green-100 text-green-700 rounded-lg text-sm font-medium">Activate</button>}
                        {(targetUser._database as any)?.accountStatus !== 'disabled' && <button disabled={actionLoading} onClick={() => updateUserStatus('disabled')} className="px-3 py-2 bg-yellow-100 text-yellow-700 rounded-lg text-sm font-medium">Disable</button>}
                        {(targetUser._database as any)?.accountStatus !== 'banned' && <button disabled={actionLoading} onClick={() => updateUserStatus('banned')} className="px-3 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-medium">Ban</button>}
                        <button disabled={actionLoading} onClick={resetUserWallet} className="px-3 py-2 bg-purple-100 text-purple-700 rounded-lg text-sm font-medium">Reset Wallet</button>
                      </div>
                    </div>
                    <div className="space-y-3 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                      <h4 className="font-semibold text-sm text-gray-600 dark:text-gray-400 uppercase tracking-wider">Force Password Reset</h4>
                      <div className="flex gap-2">
                        <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="New Password" className="w-full px-3 py-2 text-sm border rounded-lg dark:bg-gray-900 dark:text-white" />
                        <button onClick={resetUserPassword} disabled={actionLoading || newPassword.length < 6} className="px-3 py-2 bg-primary text-white rounded-lg text-sm font-medium">Set</button>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t flex justify-between items-center">
                    <p className="text-sm text-gray-500">Warning: Hard delete is permanent.</p>
                    <button onClick={deleteUser} disabled={actionLoading} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-bold flex items-center gap-2"><Trash2 className="w-4 h-4" /> DELETE USER</button>
                  </div>
                </div>

                <div className="p-6">
                  <h3 className="text-lg font-bold mb-4 border-b pb-2 dark:text-white">Auth Records</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8 text-sm">
                    {Object.entries(targetUser._auth || {}).map(([key, val]) => (
                      <div key={key} className="flex flex-col"><span className="text-gray-500 font-medium">{key}</span><span className="font-mono dark:text-white break-all">{formatValue(val)}</span></div>
                    ))}
                  </div>
                  <h3 className="text-lg font-bold mb-4 border-b pb-2 dark:text-white">Database Record</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    {targetUser._database ? Object.entries(targetUser._database).map(([key, val]) => (
                      <div key={key} className="flex flex-col"><span className="text-gray-500 font-medium">{key}</span><span className="font-mono dark:text-white break-all">{formatValue(val)}</span></div>
                    )) : <p>No DB record.</p>}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* --- GROUPS TAB --- */}
        {activeTab === 'groups' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Group Management System</h2>
              <div className="flex gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input type="text" placeholder="Search Group ID..." className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg outline-none transition-all dark:text-white" value={groupSearchQuery} onChange={(e) => setGroupSearchQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && fetchGroup()} />
                </div>
                <button onClick={fetchGroup} disabled={loading || !groupSearchQuery.trim()} className="px-6 py-3 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 flex items-center gap-2">Lookup</button>
              </div>
            </div>

            {targetGroup && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-6">
                <div>
                  <h3 className="text-2xl font-bold dark:text-white">{String((targetGroup as any).name || 'Unnamed')}</h3>
                  <p className="font-mono text-sm text-gray-500">ID: {groupSearchQuery}</p>
                  <p className="text-sm dark:text-white mt-2">Created By: {String((targetGroup as any).createdBy || 'Unknown')}</p>
                </div>

                <div className="border-t dark:border-gray-700 pt-4">
                  <h4 className="font-semibold mb-2 dark:text-white">Members</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {Object.keys((targetGroup as any).members || {}).map(uid => (
                      <div key={uid} className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg font-mono text-xs dark:text-gray-300 break-all">{uid}</div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-red-200 dark:border-red-900/30 pt-4">
                   <h4 className="font-semibold text-red-600 dark:text-red-400 mb-2">Danger Actions</h4>
                   <div className="flex flex-col sm:flex-row gap-4">
                     <div className="flex-1 flex gap-2">
                        <input type="text" placeholder="UID to remove" value={memberToRemove} onChange={(e) => setMemberToRemove(e.target.value)} className="w-full px-3 py-2 text-sm border rounded-lg dark:bg-gray-900 dark:text-white" />
                        <button onClick={removeGroupMember} className="px-3 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-medium whitespace-nowrap">Kick User</button>
                     </div>
                     <button onClick={deleteGroup} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-bold whitespace-nowrap">DELETE GROUP</button>
                   </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* --- TICKETS TAB --- */}
        {activeTab === 'tickets' && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold dark:text-white">Support Tickets</h2>
            {tickets.length === 0 ? <p className="text-gray-500">No tickets found.</p> : tickets.map(t => (
              <div key={t.id} className="p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm border">
                <div className="flex justify-between">
                  <h3 className="font-bold dark:text-white">{t.subject} <span className="text-sm font-normal text-gray-500">({t.id})</span></h3>
                  <span className={`px-2 py-1 text-xs rounded-full ${t.status === 'replied' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{t.status}</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">{t.message}</p>
                <div className="text-xs text-gray-400 mt-2">From: {t.email} | UID: {t.uid}</div>
                {t.adminReply && <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg text-sm border-l-4 border-green-500 dark:text-gray-300"><strong>Admin Reply:</strong> {t.adminReply}</div>}

                {t.status !== 'replied' && (
                  <div className="mt-4 flex gap-2">
                    <input type="text" value={ticketReply[t.id] || ''} onChange={(e) => setTicketReply({...ticketReply, [t.id]: e.target.value})} placeholder="Type reply here..." className="flex-1 px-3 py-2 text-sm border rounded-lg dark:bg-gray-900 dark:text-white" />
                    <button onClick={() => replyToTicket(t.id)} disabled={actionLoading} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium">Send Reply</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* --- REPORTS TAB --- */}
        {activeTab === 'reports' && (
          <div className="space-y-4">
             <h2 className="text-xl font-bold dark:text-white">System Reports</h2>
             {reports.length === 0 ? <p className="text-gray-500">No reports found.</p> : reports.map(r => (
               <div key={r.id} className="p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-red-100 dark:border-red-900/30">
                 <div className="flex justify-between">
                    <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-bold uppercase">{r.targetType}</span>
                    <span className="text-xs text-gray-500">{new Date(r.createdAt).toLocaleString()}</span>
                 </div>
                 <h3 className="font-bold text-lg dark:text-white mt-2">Target ID: <span className="font-mono text-sm font-normal">{r.targetId}</span></h3>
                 <p className="font-medium text-red-600 mt-1">Reason: {r.reason}</p>
                 <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">{r.details}</p>
                 <div className="text-xs text-gray-400 mt-2 border-t pt-2">Reported By UID: {r.reportedBy}</div>
               </div>
             ))}
          </div>
        )}

        {/* --- SYSTEM TAB --- */}
        {activeTab === 'system' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm border">
               <h3 className="text-lg font-bold mb-4 dark:text-white flex items-center gap-2"><Activity className="w-5 h-5 text-primary"/> Database Metrics</h3>
               <div className="space-y-4">
                 <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                   <span className="text-gray-600 dark:text-gray-400 font-medium">Total Users</span>
                   <span className="text-2xl font-bold dark:text-white">{stats.totalUsers}</span>
                 </div>
                 <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                   <span className="text-gray-600 dark:text-gray-400 font-medium">Total Groups</span>
                   <span className="text-2xl font-bold dark:text-white">{stats.totalGroups}</span>
                 </div>
               </div>
             </div>

             <div className="space-y-6">
               <div className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-yellow-200">
                  <h3 className="text-lg font-bold mb-2 text-yellow-600 dark:text-yellow-500 flex items-center gap-2"><ShieldAlert className="w-5 h-5"/> Maintenance Mode</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">When enabled, regular users will be blocked from accessing the application.</p>
                  <button onClick={toggleMaintenance} className={`w-full py-3 rounded-lg font-bold transition-colors ${stats.maintenanceMode ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-gray-100 text-gray-700 border border-gray-200 dark:bg-gray-700 dark:text-gray-300'}`}>
                    {stats.maintenanceMode ? 'DISABLE MAINTENANCE MODE' : 'ENABLE MAINTENANCE MODE'}
                  </button>
               </div>

               <div className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm border">
                  <h3 className="text-lg font-bold mb-4 dark:text-white flex items-center gap-2"><MessageCircle className="w-5 h-5 text-blue-500"/> Global Broadcast</h3>
                  <div className="space-y-3">
                    <input type="text" value={broadcastTitle} onChange={e => setBroadcastTitle(e.target.value)} placeholder="Notification Title" className="w-full px-3 py-2 border rounded-lg dark:bg-gray-900 dark:text-white" />
                    <textarea value={broadcastMessage} onChange={e => setBroadcastMessage(e.target.value)} placeholder="Message Body..." rows={3} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-900 dark:text-white" />
                    <button onClick={sendBroadcast} disabled={actionLoading} className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium">Send to All Users</button>
                  </div>
               </div>
             </div>
          </div>
        )}

      </main>
    </div>
  );
}
