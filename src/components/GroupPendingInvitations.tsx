import { useState, useEffect } from 'react';
import { getDatabase, ref, query, orderByChild, equalTo, onValue, off } from 'firebase/database';
import { Clock, UserCheck, Mail } from 'lucide-react';
import Avatar from '@/components/Avatar';

interface PendingInvitation {
    id: string;
    receiverId: string;
    receiverName?: string;
    senderName: string;
    status: 'pending';
    createdAt: string;
    type?: 'username' | 'email';
}

interface GroupPendingInvitationsProps {
    groupId: string;
}

/**
 * Shows pending invitations for a group (visible to admin)
 */
const GroupPendingInvitations = ({ groupId }: GroupPendingInvitationsProps) => {
    const [invitations, setInvitations] = useState<PendingInvitation[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!groupId) return;

        const db = getDatabase();
        const invitationsRef = ref(db, 'invitations');

        // Listen for all invitations and filter by groupId
        const handleSnapshot = (snapshot: any) => {
            if (snapshot.exists()) {
                const data = snapshot.val();
                const groupInvitations = Object.entries(data)
                    .map(([key, value]: [string, any]) => ({ ...value, id: key }))
                    .filter((inv: any) => inv.groupId === groupId && inv.status === 'pending')
                    .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

                setInvitations(groupInvitations);
            } else {
                setInvitations([]);
            }
            setLoading(false);
        };

        const unsubscribe = onValue(invitationsRef, handleSnapshot);
        return () => off(invitationsRef, 'value', handleSnapshot);
    }, [groupId]);

    if (loading || invitations.length === 0) return null;

    return (
        <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
                    <Clock className="w-4 h-4 text-amber-600" />
                </div>
                <h3 className="text-sm font-black text-gray-900 uppercase tracking-wide">
                    Pending Invitations
                </h3>
                <span className="bg-amber-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    {invitations.length}
                </span>
            </div>

            <div className="space-y-3">
                {invitations.map((inv) => (
                    <div
                        key={inv.id}
                        className="bg-amber-50/50 border border-amber-100 rounded-2xl p-4 animate-fade-in"
                    >
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <Avatar name={inv.receiverName || 'User'} size="md" />
                                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center border-2 border-white">
                                    <Clock className="w-2.5 h-2.5 text-white" />
                                </div>
                            </div>
                            <div className="flex-1">
                                <span className="font-bold text-gray-900 block">
                                    {inv.receiverName || 'Invited User'}
                                </span>
                                <span className="text-xs text-amber-600 font-bold flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                                    Waiting to accept
                                </span>
                            </div>
                            <div className="text-right">
                                <span className="text-[10px] text-gray-400 font-bold">
                                    {new Date(inv.createdAt).toLocaleDateString()}
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default GroupPendingInvitations;
