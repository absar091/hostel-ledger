/**
 * Internal helper to handle API calls
 */
const callApi = async (endpoint: string, body: any, token?: string) => {
    // Check for network connectivity first
    if (!navigator.onLine) {
        throw new Error('No internet connection. Please check your network.');
    }

    // Add 15s timeout so requests don't hang forever
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
        console.log(`[API] Calling ${endpoint}...`);

        const headers: HeadersInit = {
            'Content-Type': 'application/json'
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`${import.meta.env.VITE_API_URL}${endpoint}`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            let errorMsg = `API call failed: ${response.statusText}`;
            try {
                const errorData = await response.json();
                errorMsg = errorData.error || errorMsg;
            } catch (e) {
                // Not a JSON error
            }
            console.error(`[API] ${endpoint} failed:`, errorMsg);
            throw new Error(errorMsg);
        }

        const result = await response.json();
        console.log(`[API] ${endpoint} success`);
        return result;
    } catch (error: any) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            throw new Error('Request timed out. Please check your internet connection and try again.');
        }
        // If fetch fails due to network error (e.g. offline but navigator didn't catch it yet)
        if (error.message === 'Failed to fetch') {
             throw new Error('Network error. Please check your connection.');
        }
        throw error;
    }
};

/**
 * Helper to call secure backend APIs with Firebase ID Token
 */
export const callSecureApi = async (endpoint: string, body: any) => {
    const { auth } = await import('./firebase');
    const user = auth.currentUser;

    if (!user) {
        throw new Error("User not authenticated for API call");
    }

    // Use cached token (only refreshes if expired) — avoid forced refresh delay
    const idToken = await user.getIdToken();
    return callApi(endpoint, body, idToken);
};

/**
 * Helper to call public backend APIs without authentication
 */
export const callPublicApi = async (endpoint: string, body: any) => {
    return callApi(endpoint, body);
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

export const sendMoney = async (recipientUsername: string, amount: number, note?: string) => {
    return await callSecureApi('/api/send-money', { recipientUsername, amount, note });
};

export const respondToMoneyRequest = async (transactionId: string, accept: boolean) => {
    return await callSecureApi('/api/respond-money-request', { transactionId, accept });
};
