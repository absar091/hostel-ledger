## 2026-05-22 - Open Relay via API
**Vulnerability:** The `/api/send-email` endpoint allowed authenticated users to send arbitrary HTML emails to any recipient. This could be used for phishing attacks, making them appear to come from the official domain.
**Learning:** Generic endpoints that accept raw content (like HTML) are dangerous even if authenticated. Always use server-side templates.
**Prevention:** Avoid generic "send email" endpoints exposed to the frontend. Use specific endpoints with strictly typed parameters (e.g., `send-welcome`, `send-alert`).

## 2026-05-22 - TOCTOU Race Condition in P2P Payment System
**Vulnerability:** The `/api/respond-money-request` endpoint allowed concurrent requests to double-deduct from a sender's wallet. It checked the `pending` status via a standard read, and then applied changes via an atomic increment later. If two requests arrived simultaneously, both would read `pending` and both would increment the deduction.
**Learning:** In distributed NoSQL databases like Firebase RTDB, validation checks against a state (like `status === 'pending'`) must be atomically linked to the state transition. Relying solely on `ServerValue.increment()` for the wallet balance doesn't protect the initial logical lock.
**Prevention:** Use Firebase `transaction()` on the specific status field to lock the operation by transitioning it (e.g., `pending` to `processing`). This prevents concurrent requests from proceeding past the validation phase, safely aborting duplicates.
