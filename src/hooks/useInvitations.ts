import { useState, useEffect } from "react";
import { useFirebaseAuth } from "@/contexts/FirebaseAuthContext";
import { getDatabase, ref, onValue, off } from "firebase/database";

export interface Invitation {
    invitationId: string;
    groupId: string;
    groupName: string;
    invitedBy: string;
    createdAt: string;
    status: 'pending' | 'accepted' | 'declined' | 'expired';
}

export const useInvitations = () => {
    const { user } = useFirebaseAuth();
    const [invitations, setInvitations] = useState<Invitation[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) {
            setInvitations([]);
            setLoading(false);
            return;
        }

        const db = getDatabase();
        const invitationsRef = ref(db, `userInvitations/${user.uid}`);

        const handleSnapshot = (snapshot: any) => {
            if (snapshot.exists()) {
                const data = snapshot.val();
                const pendingInvitations = Object.values(data)
                    .filter((inv: any) => inv.status === 'pending')
                    .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) as Invitation[];

                setInvitations(pendingInvitations);
            } else {
                setInvitations([]);
            }
            setLoading(false);
        };

        const unsubscribe = onValue(invitationsRef, handleSnapshot);
        return () => off(invitationsRef, 'value', handleSnapshot);
    }, [user?.uid]); // Use user.uid to avoid unnecessary re-subscriptions if user object reference changes

    return { invitations, loading, count: invitations.length };
};
