## 2026-01-25 - Denial of Service via Global Transaction Query
**Vulnerability:** The `/api/record-payment` endpoint performed a global query on the `transactions` node (`orderByChild('timestamp').startAt(...)`) to detect duplicate payments. As the number of transactions grows, this query becomes increasingly expensive, potentially leading to database timeouts and service denial. An attacker could exploit this by flooding the system with transactions and then triggering this endpoint.
**Learning:** Checking for uniqueness or idempotency against a global dataset is non-scalable in NoSQL databases like Firebase Realtime Database. Global indexes are expensive to query without strict scoping.
**Prevention:** Always scope queries to the smallest possible dataset (e.g., a specific user or group). For idempotency, rely on unique client-generated IDs (`clientTxnId`) or checked against a limited window of *user-specific* data.

## 2026-02-04 - Type Confusion in Input Sanitization
**Vulnerability:** The `sanitize` utility function in `backend-server/utils/sanitize.js` only processed strings and returned non-string inputs (objects, arrays, numbers) as-is. This could allow an attacker to bypass sanitization by sending complex types (e.g., `{ "evil": "payload" }` or `["payload"]`) where a string was expected, potentially causing frontend crashes (DoS) or structural injection issues in the database.
**Learning:** Checking `typeof input !== 'string'` and returning the input directly is dangerous when the consumer expects a string. Sanitization functions must strictly enforce the output type to match expectations.
**Prevention:** The sanitization function was updated to coerce primitives (numbers, booleans) to strings and reject all other types (objects, arrays, null, undefined) by returning an empty string. This ensures type safety and prevents type confusion attacks.

## 2026-02-05 - Authenticated Phishing via Email Injection
**Vulnerability:** The `/api/send-password-reset` endpoint accepted a `resetLink` from the client without validation, allowing authenticated attackers to send phishing links (e.g., `http://evil.com`) via the official Hostel Ledger email. Additionally, the `name` parameter was not escaped in the email body, allowing HTML injection.
**Learning:** Never trust client-provided links in email templates. Authenticated endpoints can still be abused to attack other users ("Authenticated Phishing"). HTML content in emails must always be escaped.
**Prevention:** Validate all URLs against an allowlist (e.g., `FRONTEND_URL`, `allowedOrigins`) on the server. Always escape dynamic content in HTML templates.

## 2026-02-18 - Open Relay via Authenticated Email Endpoints
**Vulnerability:** Found `send-transaction-alert` and `send-temp-member-alert` endpoints that allowed any authenticated user to send emails to arbitrary addresses with arbitrary content. This could be abused for spam or phishing campaigns using the application's trusted email domain.
**Learning:** Authentication is not Authorization. Just because a user is logged in doesn't mean they should be allowed to send emails to anyone. Implicit authentication via global middleware can sometimes mask the lack of specific authorization logic in individual endpoints.
**Prevention:** Strictly validate that the target of a sensitive action (like sending an email) is the authenticated user themselves, or that the user has explicit permission (e.g., is a group admin) to target the recipient. Deprecate and disable unused endpoints to reduce the attack surface.

## 2026-02-18 - Denial of Service via Unbounded Strings
**Vulnerability:** Transaction endpoints (`add-expense`, `record-payment`, `send-money`, `update-wallet`) accepted free-text inputs (`note`, `place`, `method`) without any length validation. This could allow an attacker to send excessively large strings (e.g., megabytes of data), causing high memory consumption during sanitization and processing, potentially leading to Denial of Service (DoS) or excessive database storage usage.
**Learning:** Sanitization alone is not enough; validation of constraints (length, type, format) must happen *before* or during processing. Unbounded inputs are a classic resource exhaustion vector.
**Prevention:** Enforce strict length limits (e.g., 500 chars for notes) on all string inputs at the API boundary before any heavy processing or storage.
