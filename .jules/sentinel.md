## 2024-05-24 - Unvalidated clientTxnId leading to NoSQL injection and path manipulation
**Vulnerability:** Client-provided `clientTxnId` in `/api/add-expense` and `/api/record-payment` endpoints was used directly in Firebase Realtime Database path queries (`db.ref(\`processedTxns/${clientTxnId}\`)`) without format validation.
**Learning:** Even fields used solely for idempotency checks can be exploited for path traversal or NoSQL injection if they are interpolated into database paths without validation.
**Prevention:** Always explicitly validate client-generated IDs using `isValidFirebaseId` (or similar strict regex) before utilizing them in database paths or queries.

## 2024-05-24 - Insecure random number generation in security contexts
**Vulnerability:** Utility functions in `src/lib/jwt.ts` and `src/lib/email.ts` were using `Math.random()` to generate secure tokens and verification codes. This allows an attacker to potentially predict generated values due to the PRNG's predictability.
**Learning:** `Math.random()` is not cryptographically secure and should never be used for security-sensitive operations like generating tokens, passwords, or verification codes. Furthermore, when fixing this, using `window.crypto` breaks cross-environment compatibility (e.g., Node.js backend vs browser).
**Prevention:** Always use `globalThis.crypto.getRandomValues()` (or a proven cryptography library) instead of `Math.random()` when generating values that require cryptographic security, ensuring cross-environment compatibility.
