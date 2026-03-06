import React, { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from './ui/sheet';
import { useFirebaseAuth } from '../contexts/FirebaseAuthContext';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface ReportSheetProps {
  isOpen: boolean;
  onClose: () => void;
  targetId: string;
  targetType: 'user' | 'group';
}

export function ReportSheet({ isOpen, onClose, targetId, targetType }: ReportSheetProps) {
  const { firebaseUser } = useFirebaseAuth();
  const [reason, setReason] = useState('Inappropriate Behavior');
  const [details, setDetails] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason) {
      toast.error('Please select a reason');
      return;
    }

    setLoading(true);
    try {
      const token = await firebaseUser?.getIdToken();
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://hostel-ledger-backend.vercel.app';

      const response = await fetch(`${API_BASE_URL}/api/user/report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ targetId: targetId || "unknown", targetType, reason, details })
      });

      if (!response.ok) {
        throw new Error('Failed to submit report');
      }

      toast.success('Report submitted successfully. Our team will review this shortly.');
      onClose();
      setDetails('');
    } catch (error: unknown) {
      toast.error(error.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="bottom" className="h-[80vh] sm:h-[500px] flex flex-col z-[200] bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 rounded-t-3xl shadow-xl">
        <SheetHeader className="pb-4 border-b border-gray-100 dark:border-gray-800">
          <SheetTitle className="text-xl font-bold dark:text-white text-red-600">Report {targetType === 'user' ? 'User' : 'Group'}</SheetTitle>
          <SheetDescription className="text-gray-500 dark:text-gray-400">
            Please let us know why you are reporting this {targetType}.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto py-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium dark:text-gray-300">Reason</label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg dark:bg-gray-800 dark:text-white outline-none focus:border-red-500"
                  disabled={loading}
                >
                  <option value="Inappropriate Behavior">Inappropriate Behavior</option>
                  <option value="Spam or Scams">Spam or Scams</option>
                  <option value="Fake Account">Fake Account</option>
                  <option value="Offensive Content">Offensive Content</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium dark:text-gray-300">Additional Details (Optional)</label>
                <textarea
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  placeholder="Provide any additional context..."
                  className="w-full min-h-[100px] p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  disabled={loading}
                />
              </div>
              <button type="submit" className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 flex justify-center items-center w-full mt-4" disabled={loading}>
                {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                {loading ? 'Submitting...' : 'Submit Report'}
              </button>
            </form>
        </div>
      </SheetContent>
    </Sheet>
  );
}
