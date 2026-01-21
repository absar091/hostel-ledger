# DO THIS NOW - Simple Steps to Get Your APK

I cannot create the APK for you. You must do these steps on your computer.

## What I Fixed:
1. ✅ Manifest link in index.html (was wrong)
2. ✅ Vercel.json headers for manifest
3. ✅ Vite config with TWA support
4. ✅ Created assetlinks.json file

## What YOU Must Do:

### Step 1: Deploy Your Website
```bash
npm run build
```
Then deploy to Vercel. The manifest MUST be accessible online.

### Step 2: Verify Manifest Works
Open this URL in your browser:
```
https://app.hostelledger.aarx.online/manifest.webmanifest
```
You should see JSON, not HTML. If you see HTML, the deployment failed.

### Step 3: Install Bubblewrap
```bash
npm install -g @bubblewrap/cli
```

### Step 4: Create Android Folder
```bash
mkdir android
cd android
```

### Step 5: Run Bubblewrap Init
```bash
bubblewrap init --manifest=https://app.hostelledger.aarx.online/manifest.webmanifest
```

Answer the questions:
- Application name: **Hostel Ledger**
- Application ID: **online.aarx.hostelledger.twa**
- Display: **standalone**
- Orientation: **portrait**
- Status bar color: **#4a6850**
- Splash color: **#F8F9FA**
- Play Billing: **N**
- Geolocation: **N**

For keystore:
- Name: **Your Name**
- Organization: **AARX**
- Country: **Your Country Code (like US, IN)**
- Password: **Create one and USE THE SAME for both keystore and key**

### Step 6: Build APK
```bash
bubblewrap build --universalApk
```

### Step 7: Get SHA256
```bash
keytool -list -v -keystore android.keystore -alias android
```
Copy the SHA256 fingerprint.

### Step 8: Update assetlinks.json
Open `public/.well-known/assetlinks.json` and paste your SHA256.

### Step 9: Deploy Again
```bash
npm run build
```
Deploy to Vercel.

### Step 10: Test APK
Transfer `android/app-release-universal.apk` to your phone and install.

---

## What I CANNOT Do:
- ❌ Install Bubblewrap on your computer
- ❌ Run build commands on your computer
- ❌ Create the APK file
- ❌ Install JDK/Android SDK on your computer
- ❌ Transfer files to your phone

## What I CAN Do:
- ✅ Fix your code
- ✅ Update configuration files
- ✅ Create documentation
- ✅ Help troubleshoot errors

---

**The APK creation MUST happen on YOUR computer. I cannot do it remotely.**
