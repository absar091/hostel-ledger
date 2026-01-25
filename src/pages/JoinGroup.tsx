import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useFirebaseAuth } from '@/contexts/FirebaseAuthContext';

/**
 * Join Group Page
 * Handles email invite links: /join/:groupId?email=xxx
 * 
 * Flow:
 * - If user is logged in → redirect to group or show pending message
 * - If user is NOT logged in → redirect to signup with pending group info
 */
const JoinGroup = () => {
    const { id: groupId } = useParams<{ id: string }>();
    const [searchParams] = useSearchParams();
    const email = searchParams.get('email');
    const navigate = useNavigate();
    const { user, isLoading } = useFirebaseAuth();
    const [status, setStatus] = useState<'loading' | 'redirect' | 'error'>('loading');

    useEffect(() => {
        if (isLoading) return;

        // Store the pending group info for after signup/login
        if (groupId) {
            localStorage.setItem('pendingJoinGroup', JSON.stringify({
                groupId,
                email,
                timestamp: Date.now()
            }));
        }

        if (user) {
            // User is already logged in - redirect to the group
            // The group access will be handled by the invite system
            setStatus('redirect');
            setTimeout(() => {
                navigate(`/group/${groupId}`, { replace: true });
            }, 1500);
        } else {
            // User needs to sign up first
            setStatus('redirect');
            setTimeout(() => {
                navigate(`/signup?invite=${groupId}&email=${encodeURIComponent(email || '')}`, { replace: true });
            }, 1500);
        }
    }, [user, isLoading, groupId, email, navigate]);

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
            {/* Top accent */}
            <div className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#2f4336] via-[#4a6850] to-[#2f4336] z-50"></div>

            <div className="max-w-md w-full mx-4 text-center">
                {/* Logo */}
                <div className="w-20 h-20 mx-auto bg-gradient-to-br from-[#4a6850] to-[#3d5643] rounded-3xl flex items-center justify-center shadow-xl mb-8">
                    <img
                        src="/only-logo.png"
                        alt="Hostel Ledger"
                        className="w-12 h-12 object-contain filter brightness-0 invert"
                    />
                </div>

                <h1 className="text-2xl font-black text-gray-900 mb-2">
                    {user ? 'Taking you to your group...' : 'You\'ve been invited!'}
                </h1>

                <p className="text-gray-600 mb-8">
                    {user
                        ? 'Redirecting to the group page...'
                        : 'Create an account to join the group and start splitting expenses.'
                    }
                </p>

                {/* Loading spinner */}
                <div className="flex justify-center">
                    <div className="w-8 h-8 border-2 border-[#4a6850]/20 border-t-[#4a6850] rounded-full animate-spin"></div>
                </div>

                {email && (
                    <p className="text-sm text-gray-500 mt-8">
                        Invitation sent to: <span className="font-bold">{email}</span>
                    </p>
                )}
            </div>
        </div>
    );
};

export default JoinGroup;
