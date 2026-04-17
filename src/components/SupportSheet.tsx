import React, { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from './ui/sheet';
import { useFirebaseAuth } from '../contexts/FirebaseAuthContext';


import { Loader2 } from '@/lib/icons';
import { toast } from 'sonner';

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
    } catch (error: any) {
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
      <SheetContent side="bottom" className="h-[90vh] sm:h-[600px] flex flex-col bg-[#f0f4f1] border-t border-[#4a6850]/10 rounded-t-[32px] shadow-2xl p-0 overflow-hidden">
        <SheetHeader className="px-6 py-5 bg-white border-b border-[#4a6850]/5 shadow-sm">
          <SheetTitle className="text-xl font-black text-gray-900 tracking-tight">Contact Support</SheetTitle>
          <SheetDescription className="text-[#4a6850]/70 font-bold text-xs mt-1">
            {ticketId ? 'We have received your message.' : 'Send us a message and our admin team will reply via email and in-app notifications.'}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-6 pb-[calc(24px+env(safe-area-inset-bottom,0px))] md:pb-6">
          {ticketId ? (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
              <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
              </div>
              <h3 className="text-lg font-black text-gray-900">Ticket Submitted!</h3>
              <p className="text-sm font-bold text-[#4a6850]/70">Your ticket ID is:</p>
              <p className="text-2xl font-black font-mono text-[#4a6850] bg-[#4a6850]/10 px-6 py-3 rounded-2xl border border-[#4a6850]/10">{ticketId}</p>
              <p className="text-xs font-bold text-gray-500 max-w-sm mt-4 leading-relaxed">We've also sent you an email confirmation. You will receive a notification when an admin replies.</p>
              <button 
                className="mt-8 w-full max-w-xs h-12 bg-gradient-to-r from-[#4a6850] to-[#3d5643] text-white rounded-2xl font-black shadow-lg hover:shadow-xl active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4a6850] focus-visible:ring-offset-2"
                onClick={handleClose}
              >
                Close
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="support-subject" className="text-xs font-black uppercase tracking-wider text-[#4a6850]">Subject</label>
                <input
                  id="support-subject"
                  className="w-full h-12 px-4 bg-white border border-[#4a6850]/10 rounded-2xl font-bold text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#4a6850]/30 transition-all shadow-sm"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="What do you need help with?"
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="support-message" className="text-xs font-black uppercase tracking-wider text-[#4a6850]">Message</label>
                <textarea
                  id="support-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Describe your issue in detail..."
                  className="w-full min-h-[180px] p-4 bg-white border border-[#4a6850]/10 rounded-2xl font-bold text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#4a6850]/30 transition-all shadow-sm resize-none"
                  disabled={loading}
                />
              </div>
              <button 
                className="w-full h-14 bg-gradient-to-r from-[#4a6850] to-[#3d5643] text-white rounded-2xl font-black shadow-xl hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-[0.98] transition-all mt-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4a6850] focus-visible:ring-offset-2"
                type="submit" 
                disabled={loading}
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                {loading ? 'Submitting...' : 'Submit Ticket'}
              </button>
            </form>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
