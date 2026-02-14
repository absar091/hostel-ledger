const admin = require('firebase-admin');
require('dotenv').config();

// Try to initialize Firebase Admin
try {
  if (admin.apps.length === 0) {
    const serviceAccount = {
      type: "service_account",
      project_id: process.env.FIREBASE_PROJECT_ID || "hostel-ledger",
      private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
      private_key: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined,
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      client_id: process.env.FIREBASE_CLIENT_ID,
      auth_uri: "https://accounts.google.com/o/oauth2/auth",
      token_uri: "https://oauth2.googleapis.com/token",
      auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
      client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL,
      universe_domain: "googleapis.com"
    };

    if (!serviceAccount.private_key || !serviceAccount.client_email) {
      console.log('⚠️ Skipping benchmark: Missing Firebase credentials');
      process.exit(0);
    }

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: process.env.FIREBASE_DATABASE_URL || "https://hostel-ledger-default-rtdb.firebaseio.com"
    });
  }
} catch (error) {
  console.log('⚠️ Skipping benchmark: Firebase initialization failed', error.message);
  process.exit(0);
}

const db = admin.database();

async function runBenchmark() {
  console.log('🚀 Starting benchmark...');

  // 1. Create 50 dummy transactions
  const ids = [];
  const updates = {};
  for (let i = 0; i < 50; i++) {
    const ref = db.ref('transactions').push();
    ids.push(ref.key);
    updates[`transactions/${ref.key}`] = {
      id: ref.key,
      amount: i,
      timestamp: Date.now(),
      dummy: true
    };
  }

  await db.ref().update(updates);
  console.log(`✅ Created 50 dummy transactions`);

  // 2. Measure Sequential Fetch
  const startSeq = Date.now();
  for (const id of ids) {
    await db.ref(`transactions/${id}`).get();
  }
  const timeSeq = Date.now() - startSeq;
  console.log(`⏱️ Sequential fetch time: ${timeSeq}ms`);

  // 3. Measure Parallel Fetch (Simulating batch fetch)
  const startParallel = Date.now();
  await Promise.all(ids.map(id => db.ref(`transactions/${id}`).get()));
  const timeParallel = Date.now() - startParallel;
  console.log(`⏱️ Parallel fetch time: ${timeParallel}ms`);

  console.log(`📊 Speedup: ${(timeSeq / timeParallel).toFixed(2)}x`);

  // Cleanup
  const cleanupUpdates = {};
  ids.forEach(id => {
    cleanupUpdates[`transactions/${id}`] = null;
  });
  await db.ref().update(cleanupUpdates);
  console.log('🧹 Cleanup complete');

  process.exit(0);
}

runBenchmark().catch(err => {
  console.error('Benchmark failed:', err);
  process.exit(1);
});
