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

## 2024-05-18 - Open Relay Vulnerability in Welcome Email Endpoint
**Vulnerability:** The `/api/send-welcome` endpoint accepted an `email` parameter from the request body and used it directly to send emails without validating if it belonged to the authenticated user. This allowed any authenticated user to send welcome emails to arbitrary email addresses (acting as an open relay).
**Learning:** Endpoints that trigger email sending, even if authenticated, must strictly validate that the recipient matches the authenticated user's email or a closely related entity (like an invited group member) to prevent abuse and spam. In this architecture, failing to cross-check `req.body.email` with `req.user?.email` leads to a privilege escalation / abuse vector.
**Prevention:** Always verify `req.body.email === req.user?.email` for self-targeted notifications. For group-targeted notifications, verify that the authenticated user has sufficient permissions (e.g., is a member of the group) before sending to another member's email.

## 2024-05-24 - Cryptographic vulnerability due to hardcoded fallback key
**Vulnerability:** The `createToken` and `verifyToken` functions in `src/lib/jwt.ts` used a hardcoded fallback string (`'hostel-ledger-super-secret-key-2024-change-in-production'`) if the `VITE_JWT_SECRET` environment variable was not defined.
**Learning:** Hardcoded fallback keys compromise the security of any cryptographic operations that rely on them. If an environment variable containing a secret is missing, it is safer to fail securely (e.g., by throwing an error) rather than using a predictable, publicly known fallback key.
**Prevention:** Remove hardcoded fallback secrets. Explicitly check for the presence of required environment variables containing secrets and throw an error if they are missing.
## 2026-03-16 - Predictable Ticket IDs in Support
**Vulnerability:** Support tickets were generated using `Date.now().toString().slice(-8)`, making ticket IDs predictable and susceptible to enumeration or guessing.
**Learning:** Relying on timestamps or simple concatenation for IDs is insecure. It creates predictability that attackers can use to brute force or enumerate resources.
**Prevention:** Always use cryptographically secure methods like `globalThis.crypto.getRandomValues` or `crypto.randomUUID()` to generate IDs, tokens, or ticket numbers.
## 2026-03-17 - Path Traversal / NoSQL Injection in AI Parse Expense Endpoints
**Vulnerability:** The `/api/ai/parse-expense` and `/api/ai/parse-expense-audio` endpoints accepted a `groupId` directly from the request body and interpolated it into a Firebase Realtime Database path (`db.ref(\`groups/${groupId}\`)`) without prior validation. This allowed potential path traversal or NoSQL injection attacks to bypass authorization and extract arbitrary paths via AI.
**Learning:** Even AI-assisted endpoints or those that seem non-destructive can expose data if user-provided identifiers used to look up context are not strictly validated.
**Prevention:** Always explicitly validate client-provided IDs (e.g., using `isValidFirebaseId`) before interpolating them into database paths.

## 2026-03-18 - Insecure random generation for member IDs
**Vulnerability:** Found `Math.random()` being used in `/api/join-group` inside `backend-server/server_fixed.js` to generate member IDs. `Math.random()` is not cryptographically secure.
**Learning:** Functions meant to generate sensitive material such as verification codes, tokens, passwords and IDs should never rely on insecure random number generators.
**Prevention:** Always use `crypto.randomBytes(4).toString('hex')` (or similar) for generating random values intended for security purposes.

## 2024-05-25 - IDOR and NoSQL Injection in Budget Endpoints
**Vulnerability:** The `/api/budgets/group/:groupId` endpoints (GET and POST) did not validate `req.params.groupId` with `isValidFirebaseId()`, exposing the paths to NoSQL Injection. They also did not verify if the authenticated user (`req.user.uid`) actually belonged to the specified group (by checking `userGroups/${req.user.uid}/${groupId}`) before resolving the group's budget data, exposing the endpoints to Insecure Direct Object Reference (IDOR).
**Learning:** Endpoints that handle group-scoped data must always explicitly validate the path parameter formatting and verify the requesting user's authorization to access the referenced object.
**Prevention:** Always use `isValidFirebaseId()` to validate path parameters and verify user membership against `userGroups/${req.user.uid}/${groupId}` prior to querying group-scoped data.
## 2024-06-03 - IDOR in AI Expense Parsing Endpoints
**Vulnerability:** The `/api/ai/parse-expense` and `/api/ai/parse-expense-audio` endpoints processed group data without verifying if the requesting user was a member of the group, leading to an Insecure Direct Object Reference (IDOR) vulnerability.
**Learning:** Endpoints dealing with group data must explicitly verify group membership even when performing seemingly read-only or AI-assisted parsing tasks to prevent unauthorized data exposure.
**Prevention:** Always verify user membership against `userGroups/${req.user.uid}/${groupId}` before querying group-scoped data.
