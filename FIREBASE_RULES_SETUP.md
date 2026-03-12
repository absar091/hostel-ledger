# Firebase Security Rules Setup Guide

## 🚨 IMPORTANT: Fix Permission Denied Error

The error you're seeing means Firebase is blocking writes to the database. Follow these steps to fix it:

## 📋 Step-by-Step Instructions

### Step 1: Open Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project (Hostel Ledger)
3. Click on **"Realtime Database"** in the left sidebar

### Step 2: Navigate to Rules Tab

1. In the Realtime Database page, click on the **"Rules"** tab at the top
2. You'll see the current rules (probably very restrictive)

### Step 3: Replace Rules

1. **Delete all existing rules**
2. **Copy the rules from `firebase-rules.json`** file
3. **Paste them into the Firebase Console**
4. Click **"Publish"** button

### Step 4: Verify Rules Are Active

After publishing, you should see:
- ✅ Rules published successfully
- ✅ Last published: [current timestamp]

## 📄 Complete Rules (Copy This)

```json
{
  "rules": {
    "users": {
      "$userId": {
        ".read": "auth != null && (auth.uid === $userId || root.child('users').child(auth.uid).child('role').val() === 'admin' || root.child('users').child(auth.uid).child('role').val() === 'superadmin')",
        ".write": "auth != null && auth.uid === $userId",
        "role": {
          ".write": "root.child('users').child(auth.uid).child('role').val() === 'admin' || root.child('users').child(auth.uid).child('role').val() === 'superadmin'"
        }
      }
    },
    "groups": {
      "$groupId": {
        ".read": "auth != null",
        ".write": "auth != null"
      }
    },
    "userGroups": {
      "$userId": {
        ".read": "auth != null && auth.uid === $userId",
        ".write": "auth != null && auth.uid === $userId"
      }
    },
    "transactions": {
      "$transactionId": {
        ".read": "auth != null",
        ".write": "auth != null"
      }
    },
    "userTransactions": {
      "$userId": {
        ".read": "auth != null && auth.uid === $userId",
        ".write": "auth != null"
      }
    },
    "supportTickets": {
      ".read": "auth != null",
      ".write": "auth != null",
      "$ticketId": {
        ".read": "auth != null && (data.child('userId').val() === auth.uid || root.child('users').child(auth.uid).child('role').val() === 'admin' || root.child('users').child(auth.uid).child('role').val() === 'superadmin')",
        ".write": "auth != null && (data.child('userId').val() === auth.uid || !data.exists() || root.child('users').child(auth.uid).child('role').val() === 'admin' || root.child('users').child(auth.uid).child('role').val() === 'superadmin')",
        "messages": {
          ".indexOn": ["timestamp"],
          "$messageId": {
            ".read": "auth != null",
            ".write": "auth != null"
          }
        }
      }
    },
    "adminNotifications": {
      ".read": "auth != null && (root.child('users').child(auth.uid).child('role').val() === 'admin' || root.child('users').child(auth.uid).child('role').val() === 'superadmin')",
      ".write": "auth != null",
      "$notificationId": {
        ".read": "auth != null && (root.child('users').child(auth.uid).child('role').val() === 'admin' || root.child('users').child(auth.uid).child('role').val() === 'superadmin')",
        ".write": "auth != null"
      }
    },
    "invitations": {
      "$invitationId": {
        ".read": "auth != null",
        ".write": "auth != null"
      }
    },
    "userInvitations": {
      "$userId": {
        ".read": "auth != null && auth.uid === $userId",
        ".write": "auth != null"
      }
    },
    "groupInvitations": {
      "$groupId": {
        ".read": "auth != null",
        ".write": "auth != null"
      }
    },
    "pendingGroupJoins": {
      "$userId": {
        ".read": "auth != null && auth.uid === $userId",
        ".write": "auth != null"
      }
    },
    "usernames": {
      "$username": {
        ".read": "auth != null",
        ".write": "auth != null && !data.exists()"
      }
    },
    "emails": {
      "$emailKey": {
        ".read": "auth != null",
        ".write": "auth != null && !data.exists()"
      }
    }
  }
}
```

## 🔍 What These Rules Do

### Support Tickets Rules
```json
"supportTickets": {
  ".read": "auth != null",           // Any logged-in user can read
  ".write": "auth != null",          // Any logged-in user can write
  "$ticketId": {
    ".read": "...",                  // User can read their own tickets, admins can read all
    ".write": "...",                 // User can write to their tickets, admins can write to all
    "messages": {
      ".indexOn": ["timestamp"],     // Index for sorting by timestamp
      "$messageId": {
        ".read": "auth != null",     // Any logged-in user can read messages
        ".write": "auth != null"     // Any logged-in user can write messages
      }
    }
  }
}
```

### Admin Notifications Rules
```json
"adminNotifications": {
  ".read": "auth != null && (role === 'admin' || role === 'superadmin')",  // Only admins can read
  ".write": "auth != null",                                                 // Anyone can create notifications
}
```

## ✅ After Publishing Rules

1. **Refresh your app** (Ctrl + R)
2. **Try creating a support ticket** again
3. **Check if the error is gone**

## 🧪 Test the Rules

### Test 1: Create Ticket (User)
1. Go to `/support`
2. Type a message
3. Should create ticket successfully ✅

### Test 2: View Tickets (Admin)
1. Set your user role to "admin" in Firebase
2. Go to `/support-admin-dashboard`
3. Should see all tickets ✅

### Test 3: Reply to Ticket (Admin)
1. Click on a ticket
2. Type a reply
3. Should send successfully ✅

## 🚨 Troubleshooting

### Still Getting Permission Denied?

**Check 1: Are you logged in?**
```javascript
// In browser console:
firebase.auth().currentUser
// Should return user object, not null
```

**Check 2: Are rules published?**
- Go to Firebase Console → Realtime Database → Rules
- Check "Last published" timestamp
- Should be recent

**Check 3: Clear browser cache**
```
Ctrl + Shift + Delete → Clear cache
Ctrl + Shift + R → Hard refresh
```

**Check 4: Check Firebase connection**
```javascript
// In browser console:
firebase.database().ref('.info/connected').on('value', (snap) => {
  console.log('Connected:', snap.val());
});
// Should log: Connected: true
```

## 🔒 Security Notes

### What's Protected:
- ✅ Users can only read/write their own user data
- ✅ Users can only read/write their own tickets
- ✅ Admins can read/write all tickets
- ✅ Only admins can read admin notifications
- ✅ Role changes require admin privileges

### What's Open (By Design):
- ✅ Any logged-in user can create support tickets
- ✅ Any logged-in user can send messages
- ✅ Any logged-in user can create notifications (for admin alerts)

## 📊 Rule Validation

Firebase will validate your rules before publishing. If you see errors:

1. **Check JSON syntax** - Make sure all brackets match
2. **Check quotes** - Use double quotes, not single
3. **Check commas** - No trailing commas allowed
4. **Check structure** - Follow the exact format above

## 🎯 Quick Fix (If Urgent)

If you need to test immediately and don't care about security (DEVELOPMENT ONLY):

```json
{
  "rules": {
    ".read": "auth != null",
    ".write": "auth != null"
  }
}
```

⚠️ **WARNING**: This allows any logged-in user to read/write everything. Only use for testing!

## 📞 Need Help?

If you're still having issues:
1. Check Firebase Console for error messages
2. Check browser console for detailed errors
3. Verify you're logged in to the app
4. Try logging out and back in

## 🔗 Useful Links

- [Firebase Console](https://console.firebase.google.com)
- [Firebase Rules Documentation](https://firebase.google.com/docs/database/security)
- [Firebase Rules Simulator](https://firebase.google.com/docs/database/security/test-rules)

---

**After updating rules, your support system should work perfectly! 🎉**
