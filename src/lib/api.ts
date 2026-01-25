/**
 * Helper to call secure backend APIs with Firebase ID Token
 */
export const callSecureApi = async (endpoint: string, body: any) => {
    const { auth } = await import('./firebase');
    const user = auth.currentUser;

    if (!user) {
        throw new Error("User not authenticated for API call");
    }

    const idToken = await user.getIdToken(true);
    const response = await fetch(`${import.meta.env.VITE_API_URL}${endpoint}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify(body)
    });



    if (!response.ok) {
        let errorMsg = `API call failed: ${response.statusText}`;
        try {
            const errorData = await response.json();
            errorMsg = errorData.error || errorMsg;
        } catch (e) {
            // Not a JSON error
        }
        throw new Error(errorMsg);
    }

    return await response.json();
};

// Invitation Wrapper Functions
export const sendInvitation = async (groupId: string, inviteeUsername: string) => {
    return await callSecureApi('/api/send-invitation', { groupId, inviteeUsername });
};

export const respondInvitation = async (invitationId: string, accept: boolean) => {
    return await callSecureApi('/api/respond-invitation', { invitationId, accept });
};

export const sendExternalInvitation = async (groupId: string, email: string) => {
    return await callSecureApi('/api/send-external-invitation', { groupId, email });
};

export const getValidUserDetails = async (username: string) => {
    return await callSecureApi('/api/get-valid-user-details', { username });
};

export const claimEmailInvite = async (groupId: string) => {
    return await callSecureApi('/api/claim-email-invite', { groupId });
};
