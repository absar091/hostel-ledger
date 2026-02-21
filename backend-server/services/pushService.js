const admin = require('../config/firebase');

/**
 * Internal OneSignal Notification Helper (with detailed logging)
 */
const sendNotification = async ({ userIds, title, body, icon, badge, data }) => {
  console.log('🔔 ============ ONESIGNAL NOTIFICATION START ============');
  console.log('🔔 Target User IDs:', userIds);
  console.log('🔔 Title:', title);
  console.log('🔔 Body:', body);

  const oneSignalAppId = process.env.ONESIGNAL_APP_ID;
  const oneSignalApiKey = process.env.ONESIGNAL_REST_API_KEY;

  if (!oneSignalAppId || !oneSignalApiKey) {
    console.error('❌ OneSignal NOT configured! Missing env vars:',
      !oneSignalAppId ? 'ONESIGNAL_APP_ID' : '',
      !oneSignalApiKey ? 'ONESIGNAL_REST_API_KEY' : ''
    );
    throw new Error('OneSignal not configured on server');
  }
  console.log('✅ OneSignal credentials found (App ID:', oneSignalAppId.substring(0, 8) + '...)');

  // Get OneSignal Player IDs from Firebase Realtime Database
  console.log('🔍 Looking up Player IDs in Firebase...');

  const playerIdsPromises = userIds.map(async (userId) => {
    try {
      const playerRef = admin.database().ref(`oneSignalPlayers/${userId}`);
      const snapshot = await playerRef.once('value');
      const playerData = snapshot.val();

      if (playerData && playerData.playerId) {
        console.log(`  ✅ User ${userId}: Player ID found (${playerData.playerId.substring(0, 12)}...)`);
        return playerData.playerId;
      } else {
        console.log(`  ⚠️ User ${userId}: NO Player ID in Firebase (user may not have subscribed)`);
        return null;
      }
    } catch (error) {
      console.error(`  ❌ User ${userId}: Failed to get Player ID:`, error.message);
      return null;
    }
  });

  const results = await Promise.all(playerIdsPromises);
  const playerIds = results.filter(id => id !== null);

  console.log('📊 Summary: Found', playerIds.length, 'Player IDs out of', userIds.length, 'users');

  // Build notification payload
  const notificationData = {
    app_id: oneSignalAppId,
    include_external_user_ids: userIds,
    include_player_ids: playerIds.length > 0 ? playerIds : undefined,
    headings: { en: title },
    contents: { en: body },
    chrome_web_icon: icon || '/only-logo.png',
    chrome_web_badge: badge || '/only-logo.png',
    data: data || {}
  };

  console.log('📤 Sending to OneSignal API...');
  console.log('📤 Targeting:', playerIds.length > 0 ? `${playerIds.length} Player IDs` : 'External User IDs only');

  const response = await fetch('https://onesignal.com/api/v1/notifications', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Key ${oneSignalApiKey.trim()}`
    },
    body: JSON.stringify(notificationData)
  });

  const responseData = await response.json();

  if (!response.ok) {
    console.error('❌ OneSignal API Error:', responseData);
    console.log('🔔 ============ ONESIGNAL NOTIFICATION FAILED ============');
    throw new Error('OneSignal API error: ' + (responseData.errors?.[0] || JSON.stringify(responseData)));
  }

  console.log('✅ OneSignal API Response:', responseData);
  console.log('📊 Recipients:', responseData.recipients || 0);
  console.log('🔔 ============ ONESIGNAL NOTIFICATION SUCCESS ============');

  return responseData;
};

module.exports = { sendNotification };
