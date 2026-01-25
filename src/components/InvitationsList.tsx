
import React, { useState, useEffect } from "react";
import { useFirebaseAuth } from "@/contexts/FirebaseAuthContext";
import { respondInvitation } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Check, X, Mail, Loader2 } from "lucide-react";
import { getDatabase, ref, onValue, off } from "firebase/database";

interface Invitation {
    invitationId: string;
    groupId: string;
    groupName: string;
    invitedBy: string;
    createdAt: string;
    status: 'pending' | 'accepted' | 'declined' | 'expired';
}

const InvitationsList = () => {
    const { user } = useFirebaseAuth();
    const [invitations, setInvitations] = useState<Invitation[]>([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);

    useEffect(() => {
        if (!user) return;

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
    }, [user]);

    const handleRespond = async (invitationId: string, accept: boolean) => {
        try {
            setProcessingId(invitationId);
            const result = await respondInvitation(invitationId, accept);

            if (result.success) {
                toast.success(accept ? "Invitation accepted! 🎉" : "Invitation declined");
                // Optimistic update handled by real-time listener
            } else {
                toast.error(result.error || "Failed to respond");
            }
        } catch (error: any) {
            console.error("Response error:", error);
            toast.error(error.message || "Failed to respond to invitation");
        } finally {
            setProcessingId(null);
        }
    };

    if (loading) return null;

    if (invitations.length === 0) return null;

    return (
        <div className="mb-8 animate-fade-in">
            <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                    <Mail className="w-4 h-4 text-blue-600" />
                </div>
                <h2 className="text-lg font-black text-gray-900">Pending Invitations</h2>
                <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    {invitations.length}
                </span>
            </div>

            <div className="space-y-3">
                {invitations.map((inv) => (
                    <div
                        key={inv.invitationId}
                        className="bg-white rounded-2xl p-4 border border-blue-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                        <div>
                            <h3 className="font-bold text-gray-900">
                                Join "{inv.groupName}"
                            </h3>
                            <p className="text-sm text-gray-500">
                                Invited by <span className="font-semibold text-blue-600">{inv.invitedBy}</span>
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                                {new Date(inv.createdAt).toLocaleDateString()}
                            </p>
                        </div>

                        <div className="flex gap-2">
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleRespond(inv.invitationId, false)}
                                disabled={processingId === inv.invitationId}
                                className="rounded-xl border-red-100 text-red-600 hover:bg-red-50"
                            >
                                Decline
                            </Button>
                            <Button
                                size="sm"
                                onClick={() => handleRespond(inv.invitationId, true)}
                                disabled={processingId === inv.invitationId}
                                className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-200"
                            >
                                {processingId === inv.invitationId ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <>
                                        <Check className="w-4 h-4 mr-1" />
                                        Accept
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default InvitationsList;
