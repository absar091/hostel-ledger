import { useEffect, useRef } from 'react';
import { claimEmailInvite } from '@/lib/api';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

/**
 * Hook to check for and process pending group join from email invite
 * Should be called on Dashboard or Index page after user logs in
 */
export const usePendingGroupJoin = (userId: string | undefined) => {
    const navigate = useNavigate();
    const hasCheckedRef = useRef(false);

    useEffect(() => {
        if (!userId || hasCheckedRef.current) return;

        const checkPendingJoin = async () => {
            try {
                const pendingData = localStorage.getItem('pendingJoinGroup');
                if (!pendingData) return;

                const { groupId, timestamp } = JSON.parse(pendingData);

                // Check if the pending join is not too old (7 days)
                const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days in ms
                if (Date.now() - timestamp > maxAge) {
                    localStorage.removeItem('pendingJoinGroup');
                    return;
                }

                console.log('🔗 Found pending group join, attempting to claim...', groupId);

                const result = await claimEmailInvite(groupId);

                if (result.success) {
                    toast.success(`Welcome! You've joined "${result.groupName}" 🎉`);
                    localStorage.removeItem('pendingJoinGroup');

                    // Navigate to the group
                    setTimeout(() => {
                        navigate(`/group/${groupId}`);
                    }, 1500);
                } else {
                    console.log('Could not auto-join group:', result.error);
                    localStorage.removeItem('pendingJoinGroup');
                }
            } catch (error) {
                console.error('Error processing pending group join:', error);
                localStorage.removeItem('pendingJoinGroup');
            } finally {
                hasCheckedRef.current = true;
            }
        };

        // Delay slightly to ensure auth is fully ready
        const timer = setTimeout(checkPendingJoin, 2000);
        return () => clearTimeout(timer);
    }, [userId, navigate]);
};

export default usePendingGroupJoin;
