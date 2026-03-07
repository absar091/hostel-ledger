## 2024-05-24 - Unvalidated clientTxnId leading to NoSQL injection and path manipulation
**Vulnerability:** Client-provided `clientTxnId` in `/api/add-expense` and `/api/record-payment` endpoints was used directly in Firebase Realtime Database path queries (`db.ref(\`processedTxns/${clientTxnId}\`)`) without format validation.
**Learning:** Even fields used solely for idempotency checks can be exploited for path traversal or NoSQL injection if they are interpolated into database paths without validation.
**Prevention:** Always explicitly validate client-generated IDs using `isValidFirebaseId` (or similar strict regex) before utilizing them in database paths or queries.

## 2024-05-24 - Authentication bypass due to undefined environment variable
**Vulnerability:** The `adminAuth` middleware checked if `req.headers.authorization === \`Bearer ${process.env.CRON_SECRET}\``. If `CRON_SECRET` was not set, `process.env.CRON_SECRET` evaluated to `undefined`, allowing clients to bypass authentication simply by sending `Authorization: Bearer undefined`.
**Learning:** Using template literals to inject environment variables into security checks can create implicit bypass vectors when those variables are unset or misconfigured.
**Prevention:** Always explicitly check that required security environment variables are truthy (`if (!process.env.SECRET) throw Error()`) before using them in validation logic.

## 2024-05-24 - Insecure random number generation using Math.random()
**Vulnerability:** Found `Math.random()` being used in `src/lib/email.ts` to generate verification codes and in `src/lib/jwt.ts` to generate secure tokens. `Math.random()` is not cryptographically secure, which means generated values can be predictable.
**Learning:** Functions meant to generate sensitive material such as verification codes, tokens, and passwords should never rely on insecure random number generators.
**Prevention:** Always use `globalThis.crypto.getRandomValues()` for generating random values intended for security purposes.
