import React, { useState } from 'react';
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
  EyeOff
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminDashboard() {
  const { user } = useFirebaseAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  // The backend now returns { _auth: {}, _database: {} }
  const [targetUser, setTargetUser] = useState<Record<string, unknown> | null>(null);

  const [actionLoading, setActionLoading] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Use the env variable, fallback for local testing
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://hostel-ledger-backend.vercel.app';

  const fetchUser = async () => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    setTargetUser(null);
    setNewPassword(''); // Clear password field on new search

    try {
      const token = await user?.firebaseUser?.getIdToken();

      const response = await fetch(`${API_BASE_URL}/api/admin/users/${encodeURIComponent(searchQuery)}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        if (response.status === 404) throw new Error('User not found in Authentication Database.');
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch user');
      }

      const data = await response.json();
      setTargetUser(data);
    } catch (error: unknown) {
      toast.error(error.message || 'Error finding user');
    } finally {
      setLoading(false);
    }
  };

  const updateUserStatus = async (newStatus: string) => {
    if (!targetUser) return;
    const uid = targetUser._auth?.uid;
    const email = targetUser._auth?.email;

    if (newStatus === 'banned' && !window.confirm(`Are you absolutely sure you want to BAN ${email}?`)) return;

    setActionLoading(true);
    try {
      const token = await user?.firebaseUser?.getIdToken();

      const response = await fetch(`${API_BASE_URL}/api/admin/users/${uid}/status`, {
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
      await fetchUser(); // Refresh
    } catch (error: unknown) {
      toast.error(error.message || 'Error updating status');
    } finally {
      setActionLoading(false);
    }
  };

  const resetUserPassword = async () => {
    if (!targetUser) return;
    const uid = targetUser._auth?.uid;

    if (!newPassword || newPassword.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    if (!window.confirm('Are you sure you want to directly change this user\'s password? This will revoke their active sessions.')) return;

    setActionLoading(true);
    try {
      const token = await user?.firebaseUser?.getIdToken();

      const response = await fetch(`${API_BASE_URL}/api/admin/users/${uid}/password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ newPassword })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to reset password');
      }

      toast.success('Password successfully reset!');
      setNewPassword(''); // clear field
    } catch (error: unknown) {
      toast.error(error.message || 'Error resetting password');
    } finally {
      setActionLoading(false);
    }
  };

  const deleteUser = async () => {
    if (!targetUser) return;
    const uid = targetUser._auth?.uid;
    const email = targetUser._auth?.email;

    const confirmation = window.prompt(`DANGER: You are about to completely delete user ${email} from Authentication and the Database.\n\nType the email exactly to confirm:`);
    if (confirmation !== email) {
      toast.error('Deletion cancelled. Email did not match.');
      return;
    }

    setActionLoading(true);
    try {
      const token = await user?.firebaseUser?.getIdToken();

      const response = await fetch(`${API_BASE_URL}/api/admin/users/${uid}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to delete user');
      }

      toast.success('User completely deleted.');
      setTargetUser(null);
      setSearchQuery('');
    } catch (error: unknown) {
      toast.error(error.message || 'Error deleting user');
    } finally {
      setActionLoading(false);
    }
  };

  // Helper to format any value as string for the text view
  const formatValue = (val: unknown): string => {
    if (val === null || val === undefined) return 'null';
    if (typeof val === 'boolean') return val ? 'Yes/True' : 'No/False';
    if (typeof val === 'object') {
      // Don't render full objects as [object Object], format them nicer if possible
      if (Array.isArray(val)) return `[ ${val.join(', ')} ]`;
      // Instead of JSON.stringify which the user doesn't want, count keys or map them
      const keys = Object.keys(val);
      if (keys.length === 0) return 'Empty';
      return `Contains ${keys.length} items (Keys: ${keys.slice(0, 5).join(', ')}${keys.length > 5 ? '...' : ''})`;
    }
    return String(val);
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
          <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Full User Data Extraction</h2>
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
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Extract Data'}
            </button>
          </div>
        </div>

        {/* Results Section */}
        {targetUser && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden animate-in fade-in slide-in-from-bottom-4">

            <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-red-500" />
                DANGER ZONE: Critical Actions
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                {/* Status Toggles */}
                <div className="space-y-3 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                  <h4 className="font-semibold text-sm text-gray-600 dark:text-gray-400 uppercase tracking-wider">Account Status</h4>
                  <div className="flex flex-wrap gap-2">
                    {targetUser._database?.accountStatus !== 'active' && (
                      <button
                        disabled={actionLoading}
                        onClick={() => updateUserStatus('active')}
                        className="flex-1 flex justify-center items-center gap-2 px-3 py-2 bg-green-100 hover:bg-green-200 text-green-700 dark:bg-green-900/30 dark:hover:bg-green-900/50 dark:text-green-400 rounded-lg transition-colors font-medium text-sm"
                      >
                        <UserCheck className="w-4 h-4" /> Unban / Activate
                      </button>
                    )}
                    {targetUser._database?.accountStatus !== 'disabled' && (
                      <button
                        disabled={actionLoading}
                        onClick={() => updateUserStatus('disabled')}
                        className="flex-1 flex justify-center items-center gap-2 px-3 py-2 bg-yellow-100 hover:bg-yellow-200 text-yellow-700 dark:bg-yellow-900/30 dark:hover:bg-yellow-900/50 dark:text-yellow-400 rounded-lg transition-colors font-medium text-sm"
                      >
                        <UserX className="w-4 h-4" /> Disable
                      </button>
                    )}
                    {targetUser._database?.accountStatus !== 'banned' && (
                      <button
                        disabled={actionLoading}
                        onClick={() => updateUserStatus('banned')}
                        className="flex-1 flex justify-center items-center gap-2 px-3 py-2 bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-900/30 dark:hover:bg-red-900/50 dark:text-red-400 rounded-lg transition-colors font-medium text-sm"
                      >
                        <ShieldAlert className="w-4 h-4" /> BAN
                      </button>
                    )}
                  </div>
                </div>

                {/* Password Reset */}
                <div className="space-y-3 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                  <h4 className="font-semibold text-sm text-gray-600 dark:text-gray-400 uppercase tracking-wider">Force Password Reset</h4>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="New Password (min 6 chars)"
                        className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary outline-none dark:text-white"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <button
                      onClick={resetUserPassword}
                      disabled={actionLoading || newPassword.length < 6}
                      className="px-3 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center gap-1"
                    >
                      <KeyRound className="w-4 h-4" /> Set
                    </button>
                  </div>
                </div>
              </div>

              {/* Hard Delete */}
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
                <p className="text-sm text-gray-500 dark:text-gray-400 max-w-lg">
                  <strong>Warning:</strong> Hard deleting a user removes all their authentication records and realtime database info permanently.
                </p>
                <button
                  onClick={deleteUser}
                  disabled={actionLoading}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-bold flex items-center gap-2 transition-colors"
                >
                  <Trash2 className="w-4 h-4" /> PERMANENTLY DELETE
                </button>
              </div>
            </div>

            {/* Display All Extracted Text Data */}
            <div className="p-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 border-b border-gray-200 dark:border-gray-700 pb-2">
                Authentication Records
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-y-3 gap-x-6 mb-8 text-sm">
                {Object.entries(targetUser._auth || {}).map(([key, val]) => (
                  <div key={`auth-${key}`} className="flex flex-col border-b border-gray-100 dark:border-gray-800 pb-2">
                    <span className="text-gray-500 dark:text-gray-400 font-medium capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                    <span className="text-gray-900 dark:text-gray-100 font-mono mt-1 break-all">
                      {formatValue(val)}
                    </span>
                  </div>
                ))}
              </div>

              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 border-b border-gray-200 dark:border-gray-700 pb-2">
                Complete Realtime Database Record
              </h3>

              {targetUser._database && Object.keys(targetUser._database).length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-y-3 gap-x-6 text-sm">
                  {Object.entries(targetUser._database).map(([key, val]) => (
                    <div key={`db-${key}`} className="flex flex-col border-b border-gray-100 dark:border-gray-800 pb-2">
                      <span className="text-gray-500 dark:text-gray-400 font-medium capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                      <span className="text-gray-900 dark:text-gray-100 font-mono mt-1 break-words whitespace-pre-wrap">
                        {formatValue(val)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 dark:text-gray-400 text-sm italic">
                  No realtime database records found for this user ID.
                </p>
              )}
            </div>

          </div>
        )}
      </main>
    </div>
  );
}
