import { sendTransactionAlertEmail } from './email';

export interface TransactionData {
  id: string;
  type: 'expense' | 'payment' | 'settlement';
  title: string;
  amount: number;
  groupId: string;
  groupName: string;
  paidBy: string;
  paidByName: string;
  participants: string[];
  date: string;
  description?: string;
  method?: string;
}

export interface UserData {
  uid: string;
  email: string;
  name: string;
}

/**
 * Send transaction alert emails to all relevant users
 */
export const sendTransactionNotifications = async (
  transaction: TransactionData,
  users: UserData[]
): Promise<{ success: boolean; errors: string[] }> => {
  const errors: string[] = [];

  try {
    console.log('📧 Sending transaction notifications for:', transaction.title);

    // Format transaction details
    const transactionType = getTransactionTypeDisplay(transaction.type);
    const amount = `Rs ${transaction.amount.toLocaleString()}`;
    const date = new Date(transaction.date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    const description = transaction.description || transaction.title;

    // Send emails to all users (including the person who created the transaction)
    const emailPromises = users
      .map(async (user) => {
        try {
          await sendTransactionAlertEmail(
            user.email,
            user.name,
            transactionType,
            amount,
            transaction.groupName,
            date,
            description
          );
          console.log(`✅ Transaction alert sent to ${user.email}`);
        } catch (error: any) {
          const errorMsg = `Failed to send transaction alert to ${user.email}: ${error.message}`;
          console.error('❌', errorMsg);
          errors.push(errorMsg);
        }
      });

    // Wait for all emails to complete
    await Promise.allSettled(emailPromises);

    const success = errors.length === 0;
    if (success) {
      console.log('✅ All transaction notifications sent successfully');
    } else {
      console.warn(`⚠️ Transaction notifications completed with ${errors.length} errors`);
    }

    return { success, errors };

  } catch (error: any) {
    console.error('❌ Transaction notification system error:', error);
    errors.push(`System error: ${error.message}`);
    return { success: false, errors };
  }
};

/**
 * Trigger push notifications via OneSignal backend
 * Updated: 2026-01-25 - Using more reliable multi-notify endpoint
 */
export const triggerPushNotification = async (payload: {
  userIds: string[];
  title: string;
  body: string;
  data?: any;
}): Promise<{ success: boolean; error?: string }> => {
  try {
    const apiUrl = `${import.meta.env.VITE_API_URL}/api/push-notify-multiple?t=${Date.now()}`;
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      },
      body: JSON.stringify({
        userIds: payload.userIds,
        title: payload.title,
        body: payload.body,
        data: payload.data,
        icon: '/only-logo.png',
        badge: '/only-logo.png'
      })
    });

    const result = await response.json();
    console.log('🔔 Push notification result:', result);
    return { success: response.ok };
  } catch (error: any) {
    console.error('❌ Failed to trigger push notification:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send transaction alert to a specific user
 */
export const sendTransactionNotificationToUser = async (
  transaction: TransactionData,
  user: UserData
): Promise<{ success: boolean; error?: string }> => {
  try {
    console.log(`📧 Sending transaction notification to ${user.email}`);

    const transactionType = getTransactionTypeDisplay(transaction.type);
    const amount = `Rs ${transaction.amount.toLocaleString()}`;
    const date = new Date(transaction.date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    const description = transaction.description || transaction.title;

    await sendTransactionAlertEmail(
      user.email,
      user.name,
      transactionType,
      amount,
      transaction.groupName,
      date,
      description
    );

    console.log(`✅ Transaction alert sent to ${user.email}`);
    return { success: true };

  } catch (error: any) {
    const errorMsg = `Failed to send transaction alert to ${user.email}: ${error.message}`;
    console.error('❌', errorMsg);
    return { success: false, error: errorMsg };
  }
};

/**
 * Get display-friendly transaction type
 */
const getTransactionTypeDisplay = (type: string): string => {
  switch (type) {
    case 'expense':
      return 'New Expense';
    case 'payment':
      return 'Payment Made';
    case 'settlement':
      return 'Settlement';
    default:
      return 'Transaction';
  }
};

/**
 * Check if transaction notifications should be sent
 * (You can add user preferences here later)
 */
export const shouldSendTransactionNotification = (
  transaction: TransactionData,
  user: UserData
): boolean => {
  // Send to all users regardless of whether they are the payer or participant
  return true;
};

/**
 * Format transaction for email display
 */
export const formatTransactionForEmail = (transaction: TransactionData) => {
  return {
    type: getTransactionTypeDisplay(transaction.type),
    amount: `Rs ${transaction.amount.toLocaleString()}`,
    date: new Date(transaction.date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }),
    description: transaction.description || transaction.title,
    groupName: transaction.groupName
  };
};