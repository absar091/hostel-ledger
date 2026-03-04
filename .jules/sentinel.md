## 2026-03-03 - Path Traversal in Push Notification Endpoints
**Vulnerability:** The `/api/push-notify` and `/api/push-notify-multiple` endpoints accepted `userId` inputs directly from the request body without validation. An attacker could potentially use path traversal sequences (e.g., `../`) in the `userId` to manipulate internal logic or file paths if the ID were used in file operations or as a database key in a way that allows traversal (though Firebase keys are generally resilient, downstream systems might not be).
**Learning:** Even when using abstracted database libraries, always validate IDs against a strict allowlist (alphanumeric + safe separators) to prevent unexpected behavior in current or future logic that might rely on these IDs for file system or critical path operations.
**Prevention:** Explicitly validate all user-provided IDs using `isValidFirebaseId` (or a similar strict regex) at the API boundary before passing them to internal functions or third-party services. Added `isValidFirebaseId` checks to both endpoints.

## 2024-05-15 - Race Condition in P2P Transaction Status
**Vulnerability:** The `/api/respond-money-request` endpoint checked `if (tx.status !== 'pending')` before performing an atomic multi-path update. This read-modify-write pattern allowed a classic race condition where an attacker could send multiple concurrent requests to accept the *same* transaction. Both requests would see `pending`, pass the balance check, and deduct the amount multiple times.
**Learning:** Checking a value using `.get()` and then updating it later using `.update()` is never atomic and is vulnerable to race conditions if the endpoint can be called concurrently by the same user.
**Prevention:** Use a Firebase `transaction()` directly on the specific status node (e.g., `p2p_transactions/${transactionId}/status`) to atomically "claim" the transaction by changing its state from `pending` to `processing`. If the transaction successfully commits, proceed with the multi-path update. This lock guarantees the transaction is only processed exactly once.

## 2025-05-15 - Missing Explicit Authentication on Push Notification Endpoints
**Vulnerability:** The `/api/push-notify` and `/api/push-notify-multiple` endpoints relied solely on a global `app.use('/api', authenticate)` middleware order for authentication, rather than explicitly including `authenticate` in their route definitions.
**Learning:** Relying on global middleware ordering for sensitive endpoints can lead to accidental auth bypasses if routes are reordered or if the global middleware is bypassed for specific paths.
**Prevention:** Explicitly apply the `authenticate` middleware to the route definitions of all sensitive endpoints to enforce defense in depth.
## 2026-03-04 - Unexplicit Payload Limits in Express Middleware
**Vulnerability:** The `express.json()` middleware in `backend-server/server.js` was relying on default configurations, which although relatively safe (`100kb`), can be overlooked or unexpectedly changed across library versions.
**Learning:** Always configure explicit payload size limits on body-parsing middleware as a defense in depth strategy to prevent large payload-based DoS attacks and guarantee stable limits regardless of defaults.
**Prevention:** Explicitly set the `limit` option (e.g., `limit: '100kb'`) for `express.json()` to restrict the maximum request body size, preventing unexpected large payloads while supporting legitimate API traffic.
