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
