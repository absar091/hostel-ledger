import { useState } from 'react';
import { useFirebaseAuth as useAuth } from '@/contexts/FirebaseAuthContext';
import { Search, Shield, UserX, UserCheck, ShieldAlert, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminDashboard() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [targetUser, setTargetUser] = useState<Record<string, unknown> | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // In a real app, you would use an env variable for API base URL
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://hostel-ledger-backend.vercel.app';

  const fetchUser = async () => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    setTargetUser(null);
    try {
      // Get the Firebase auth token from local storage or context if possible
      // Assuming a generic token auth here - replace with actual token retrieval
      const token = await user?.firebaseUser?.getIdToken();

      const response = await fetch(`${API_BASE_URL}/api/admin/users/${encodeURIComponent(searchQuery)}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        if (response.status === 404) throw new Error('User not found');
        throw new Error('Failed to fetch user');
      }

      const data = await response.json();
      setTargetUser(data);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Error finding user');
    } finally {
      setLoading(false);
    }
  };

  const updateUserStatus = async (newStatus: string) => {
    if (!targetUser) return;
    if (newStatus === 'banned' && !window.confirm(`Are you absolutely sure you want to BAN ${String(targetUser.email)}?`)) return;

    setActionLoading(true);
    try {
      const token = await user?.firebaseUser?.getIdToken();

      const response = await fetch(`${API_BASE_URL}/api/admin/users/${String(targetUser.uid)}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to update status');
      }

      toast.success(`User successfully updated to ${newStatus}`);
      // Refresh user details
      await fetchUser();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Error updating status');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-12">
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 flex justify-between items-center sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Shield className="w-8 h-8 text-primary" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Secure Admin Dashboard</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">
            {user?.role?.toUpperCase()}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6 mt-6 space-y-6">
        {/* Search Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">User Lookup System</h2>
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by Email or User ID..."
                className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all dark:text-white"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchUser()}
              />
            </div>
            <button
              onClick={fetchUser}
              disabled={loading || !searchQuery.trim()}
              className="px-6 py-3 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2 transition-all"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Lookup User'}
            </button>
          </div>
        </div>

        {/* Results Section */}
        {targetUser && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden animate-in fade-in slide-in-from-bottom-4">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-start">
              <div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                  User Information
                </h3>
                <p className="text-gray-500 dark:text-gray-400 font-mono text-sm">
                  ID: {String(targetUser.uid)}
                </p>
              </div>
              <div className={`px-4 py-1.5 rounded-full text-sm font-bold uppercase tracking-wider ${
                String(targetUser.accountStatus) === 'active' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                String(targetUser.accountStatus) === 'disabled' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
              }`}>
                {String(targetUser.accountStatus)}
              </div>
            </div>

            <div className="p-6 space-y-6 text-gray-800 dark:text-gray-200 font-medium">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8">
                <div><span className="text-gray-500 dark:text-gray-400 font-normal">Full Name:</span> {String(targetUser.name)}</div>
                <div><span className="text-gray-500 dark:text-gray-400 font-normal">Email:</span> {String(targetUser.email)}</div>
                <div><span className="text-gray-500 dark:text-gray-400 font-normal">Email Verified:</span> {targetUser.emailVerified ? 'Yes' : 'No'}</div>
                <div><span className="text-gray-500 dark:text-gray-400 font-normal">Phone:</span> {String(targetUser.phone)}</div>
                <div><span className="text-gray-500 dark:text-gray-400 font-normal">Role:</span> {String(targetUser.role).toUpperCase()}</div>
                <div><span className="text-gray-500 dark:text-gray-400 font-normal">Created On:</span> {new Date(String(targetUser.createdAt)).toLocaleDateString()}</div>
                <div><span className="text-gray-500 dark:text-gray-400 font-normal">Last Login:</span> {new Date(String(targetUser.lastLogin)).toLocaleString()}</div>
                <div><span className="text-gray-500 dark:text-gray-400 font-normal">2FA Enabled:</span> {String(targetUser.is2FAEnabled)}</div>
              </div>

              <div className="pt-6 border-t border-gray-200 dark:border-gray-700 grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8">
                <div><span className="text-gray-500 dark:text-gray-400 font-normal">Groups Joined:</span> {String(targetUser.groupsJoined)}</div>
                <div><span className="text-gray-500 dark:text-gray-400 font-normal">Total Posts:</span> {String(targetUser.totalPosts)}</div>
                <div><span className="text-gray-500 dark:text-gray-400 font-normal">Total Reports Against User:</span> {String(targetUser.totalReportsAgainstUser)}</div>
                <div><span className="text-gray-500 dark:text-gray-400 font-normal">Wallet Balance:</span> Rs {String(targetUser.walletBalance)}</div>
              </div>

              <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                <h4 className="font-bold text-gray-900 dark:text-white mb-4">Admin Controls</h4>
                <div className="flex flex-wrap gap-4">
                  {String(targetUser.accountStatus) !== 'active' && (
                    <button
                      disabled={actionLoading}
                      onClick={() => updateUserStatus('active')}
                      className="flex items-center gap-2 px-4 py-2 bg-green-100 hover:bg-green-200 text-green-700 dark:bg-green-900/30 dark:hover:bg-green-900/50 dark:text-green-400 rounded-lg transition-colors font-medium"
                    >
                      <UserCheck className="w-4 h-4" /> Activate Account
                    </button>
                  )}
                  {String(targetUser.accountStatus) !== 'disabled' && (
                    <button
                      disabled={actionLoading}
                      onClick={() => updateUserStatus('disabled')}
                      className="flex items-center gap-2 px-4 py-2 bg-yellow-100 hover:bg-yellow-200 text-yellow-700 dark:bg-yellow-900/30 dark:hover:bg-yellow-900/50 dark:text-yellow-400 rounded-lg transition-colors font-medium"
                    >
                      <UserX className="w-4 h-4" /> Disable Account
                    </button>
                  )}
                  {String(targetUser.accountStatus) !== 'banned' && (
                    <button
                      disabled={actionLoading}
                      onClick={() => updateUserStatus('banned')}
                      className="flex items-center gap-2 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-900/30 dark:hover:bg-red-900/50 dark:text-red-400 rounded-lg transition-colors font-medium"
                    >
                      <ShieldAlert className="w-4 h-4" /> Ban Account
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
