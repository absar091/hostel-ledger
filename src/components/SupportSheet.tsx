import React, { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from './ui/sheet';
import { useFirebaseAuth } from '../contexts/FirebaseAuthContext';


import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface SupportSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SupportSheet({ isOpen, onClose }: SupportSheetProps) {
  const { firebaseUser } = useFirebaseAuth();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [ticketId, setTicketId] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const token = await firebaseUser?.getIdToken();
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://hostel-ledger-backend.vercel.app';

      const response = await fetch(`${API_BASE_URL}/api/user/support`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ subject, message })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to submit ticket');
      }

      const data = await response.json();
      setTicketId(data.ticketId);
      toast.success('Support ticket submitted!');
    } catch (error: unknown) {
      toast.error(error.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSubject('');
    setMessage('');
    setTicketId(null);
    onClose();
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <SheetContent side="bottom" className="h-[80vh] sm:h-[600px] flex flex-col bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 rounded-t-3xl shadow-xl">
        <SheetHeader className="pb-4 border-b border-gray-100 dark:border-gray-800">
          <SheetTitle className="text-xl font-bold dark:text-white">Contact Support</SheetTitle>
          <SheetDescription className="text-gray-500 dark:text-gray-400">
            {ticketId ? 'We have received your message.' : 'Send us a message and our admin team will reply via email and in-app notifications.'}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto py-6">
          {ticketId ? (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
              <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
              </div>
              <h3 className="text-xl font-bold dark:text-white">Ticket Submitted!</h3>
              <p className="text-gray-600 dark:text-gray-300">Your ticket ID is:</p>
              <p className="text-2xl font-mono font-bold text-primary bg-primary/10 px-4 py-2 rounded-lg">{ticketId}</p>
              <p className="text-sm text-gray-500 max-w-sm mt-4">We've also sent you an email confirmation. You will receive a notification when an admin replies.</p>
              <button className="px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 flex justify-center items-center w-full" onClick={handleClose} className="mt-6 w-full max-w-xs">Close</button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium dark:text-gray-300">Subject</label>
                <input className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg dark:bg-gray-800 dark:text-white outline-none focus:border-primary"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="What do you need help with?"
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium dark:text-gray-300">Message</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Describe your issue in detail..."
                  className="w-full min-h-[150px] p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  disabled={loading}
                />
              </div>
              <button className="px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 flex justify-center items-center w-full" type="submit" className="w-full mt-4" disabled={loading}>
                {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                {loading ? 'Submitting...' : 'Submit Ticket'}
              </button>
            </form>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
