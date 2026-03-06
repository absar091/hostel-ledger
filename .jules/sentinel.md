## 2024-05-24 - Unvalidated clientTxnId leading to NoSQL injection and path manipulation
**Vulnerability:** Client-provided `clientTxnId` in `/api/add-expense` and `/api/record-payment` endpoints was used directly in Firebase Realtime Database path queries (`db.ref(\`processedTxns/${clientTxnId}\`)`) without format validation.
**Learning:** Even fields used solely for idempotency checks can be exploited for path traversal or NoSQL injection if they are interpolated into database paths without validation.
**Prevention:** Always explicitly validate client-generated IDs using `isValidFirebaseId` (or similar strict regex) before utilizing them in database paths or queries.
