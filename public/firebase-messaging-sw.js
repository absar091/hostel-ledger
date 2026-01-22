// Firebase Cloud Messaging Service Worker
// This file handles background push notifications

importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Initialize Firebase in the service worker
firebase.initializeApp({
  apiKey: "AIzaSyDnbnq_aO1JHFshsY4RmBoU0NiHOqnq9mU",
  authDomain: "hostel-ledger.firebaseapp.com",
  databaseURL: "https://hostel-ledger-default-rtdb.firebaseio.com",
  projectId: "hostel-ledger",
  storageBucket: "hostel-ledger.firebasestorage.app",
  messagingSenderId: "841373188948",
  appId: "1:841373188948:web:16c8dea6cfbdbaaebf7ec1"
});

// Retrieve an instance of Firebase Messaging
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.notification?.title || 'Hostel Ledger';
  const notificationOptions = {
    body: payload.notification?.body || 'You have a new notification',
    icon: payload.notification?.icon || '/only-logo.png',
    badge: payload.notification?.badge || '/only-logo.png',
    tag: payload.notification?.tag || 'default',
    data: payload.data || {}
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification click received.');
  
  event.notification.close();
  
  // Open the app when notification is clicked
  event.waitUntil(
    clients.openWindow('/')
  );
});
