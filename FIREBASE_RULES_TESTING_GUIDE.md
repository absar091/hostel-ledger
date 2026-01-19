# 🔥 Firebase Rules Testing Guide

This guide provides comprehensive testing for both Firebase Realtime Database and Firestore rules to ensure no permission errors occur during normal operations.

## 🚀 Quick Start

### Option 1: Browser Testing (Recommended)
1. Open `test-firebase-rules-browser.html` in your browser
2. Click "🚀 Run All Tests" to test both databases
3. View real-time results and detailed feedback

### Option 2: Node.js Testing
1. Install dependencies: `npm install firebase`
2. Run tests: `node test-firebase-rules.js`
3. View console output for results

## 📋 What Gets Tested

### Firebase Realtime Database Tests
- ✅ User can create their own profile
- ✅ User can read their own profile  
- ✅ User can update their own profile
- ✅ User can create groups
- ✅ User can create transactions
- ✅ User can read their own transactions
- ✅ User can update their own transactions
- ✅ User can set email verification
- 🔒 User 2 cannot read User 1's profile
- 🔒 User 2 cannot access User 1's transactions

### Firestore Tests
- ✅ User can create their own profile
- ✅ User can read their own profile
- ✅ User can update their own profile
- ✅ User can create groups
- ✅ User can create transactions
- ✅ User can read their own transactions
- 🔒 User 2 cannot read User 1's profile
- 🔒 User 2 cannot access User 1's transactions

## 🔧 Test Configuration

### Test Users
The tests use these temporary test accounts:
- **User 1:** `test-rules@example.com` / `testpassword123`
- **User 2:** `test-rules2@example.com` / `testpassword123`

### Cleanup
All test data is automatically cleaned up after testing:
- Test user profiles
- Test groups
- Test transactions
- Test verification records

## 📊 Understanding Results

### Success Indicators
- ✅ **Green checkmarks** = Operations that should succeed
- 🔒 **Security tests** = Operations that should be denied

### Failure Indicators
- ❌ **Red X marks** = Unexpected failures
- Permission denied errors on security tests are **expected and good**

## 🛠️ Troubleshooting

### Common Issues

#### Permission Denied Errors
If you see permission denied errors on normal operations:

1. **Check Firebase Rules Deployment**
   ```bash
   firebase deploy --only database
   firebase deploy --only firestore:rules
   ```

2. **Verify Rules Syntax**
   - Check `database.rules.json` for Realtime Database
   - Check `firestore.rules` for Firestore

3. **Authentication Issues**
   - Ensure Firebase Auth is enabled
   - Check if test users can be created

#### Network/Connection Issues
- Ensure internet connection
- Check Firebase project configuration
- Verify API keys and project settings

### Expected Test Results

#### ✅ Should Pass (Normal Operations)
- User creating their own profile
- User reading their own data
- User updating their own data
- User creating groups they belong to
- User creating transactions in their groups

#### 🔒 Should Fail (Security Tests)
- User accessing another user's profile
- User accessing transactions they don't own
- Unauthenticated access to protected data

## 🔍 Detailed Test Scenarios

### Scenario 1: User Profile Management
```javascript
// Should succeed
await set(ref(database, `users/${currentUser.uid}`), userProfile);
await get(ref(database, `users/${currentUser.uid}`));
await update(ref(database, `users/${currentUser.uid}`), updates);

// Should fail
await get(ref(database, `users/${otherUser.uid}`)); // ❌ Permission denied
```

### Scenario 2: Group Operations
```javascript
// Should succeed
await set(ref(database, `groups/${groupId}`), groupData);
await set(ref(database, `userGroups/${currentUser.uid}/${groupId}`), true);

// Should fail (if not a member)
await get(ref(database, `groups/${otherUserGroup}`)); // ❌ Permission denied
```

### Scenario 3: Transaction Management
```javascript
// Should succeed
await set(ref(database, `transactions/${transactionId}`), transactionData);
await set(ref(database, `userTransactions/${currentUser.uid}/${transactionId}`), true);

// Should fail
await get(ref(database, `transactions/${otherUserTransaction}`)); // ❌ Permission denied
```

## 📈 Performance Considerations

### Test Execution Time
- **Browser tests:** ~30-60 seconds
- **Node.js tests:** ~20-40 seconds
- **Cleanup:** ~10-20 seconds

### Rate Limiting
- Tests include delays between operations
- Automatic retry logic for temporary failures
- Cleanup runs after all tests complete

## 🔐 Security Validation

### What We Verify
1. **Data Isolation:** Users can only access their own data
2. **Group Membership:** Only group members can access group data
3. **Transaction Ownership:** Only transaction participants can access transactions
4. **Authentication Required:** No unauthenticated access to protected data

### Security Test Matrix
| Operation | Own Data | Other User Data | Expected Result |
|-----------|----------|-----------------|-----------------|
| Read Profile | ✅ Allow | ❌ Deny | Pass |
| Write Profile | ✅ Allow | ❌ Deny | Pass |
| Read Groups | ✅ Allow (if member) | ❌ Deny | Pass |
| Write Groups | ✅ Allow (if member) | ❌ Deny | Pass |
| Read Transactions | ✅ Allow (if participant) | ❌ Deny | Pass |
| Write Transactions | ✅ Allow (if participant) | ❌ Deny | Pass |

## 🚨 When to Run Tests

### Required Testing Scenarios
- **Before deployment:** Always test rules before going live
- **After rule changes:** Test whenever you modify security rules
- **Regular audits:** Monthly security rule validation
- **After Firebase updates:** Test when Firebase SDK is updated

### Continuous Integration
Add to your CI/CD pipeline:
```yaml
- name: Test Firebase Rules
  run: node test-firebase-rules.js
```

## 📞 Support

If tests fail unexpectedly:

1. **Check Firebase Console** for rule syntax errors
2. **Review test output** for specific error messages  
3. **Verify Firebase project** configuration
4. **Check authentication** setup in Firebase Console

## 🎯 Success Criteria

Your Firebase rules are properly configured when:
- ✅ All normal operations pass
- ✅ All security tests properly deny access
- ✅ No unexpected permission errors
- ✅ 100% test success rate

---

**Last Updated:** January 19, 2026  
**Compatible with:** Firebase v10.7.1+