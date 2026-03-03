const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

// Path to your service account key file
const serviceAccountPath = path.resolve(__dirname, '../serviceAccountKey.json');

if (!fs.existsSync(serviceAccountPath)) {
  console.error(`❌ Error: serviceAccountKey.json not found at ${serviceAccountPath}`);
  console.error('Please download it from Firebase Console -> Project Settings -> Service Accounts');
  console.error('and place it in the backend-server folder.');
  process.exit(1);
}

const serviceAccount = require(serviceAccountPath);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DATABASE_URL || "https://hostel-ledger-default-rtdb.firebaseio.com"
});

const db = admin.database();
const auth = admin.auth();

const adminEmails = {
  'Ahmadraoabsar@gmail.com': 'admin',
  'absar.ahmad.rao@aarx.online': 'superadmin'
};

async function setupAdmins() {
  console.log('🚀 Starting admin setup...');

  for (const [email, role] of Object.entries(adminEmails)) {
    try {
      console.log(`\n🔍 Looking for user with email: ${email}`);
      const userRecord = await auth.getUserByEmail(email);
      const uid = userRecord.uid;

      console.log(`✅ Found user: ${uid}. Updating database...`);

      const userRef = db.ref(`users/${uid}`);
      await userRef.update({
        role: role,
        accountStatus: 'active'
      });

      console.log(`🎉 Successfully updated ${email} to role: ${role}`);
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        console.error(`❌ User not found: ${email}. Please ensure they have signed up first.`);
      } else {
        console.error(`❌ Error updating ${email}:`, error);
      }
    }
  }

  console.log('\n✅ Admin setup script finished.');
  process.exit(0);
}

setupAdmins();
