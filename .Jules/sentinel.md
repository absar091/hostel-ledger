## 2026-05-22 - Open Relay via API
**Vulnerability:** The `/api/send-email` endpoint allowed authenticated users to send arbitrary HTML emails to any recipient. This could be used for phishing attacks, making them appear to come from the official domain.
**Learning:** Generic endpoints that accept raw content (like HTML) are dangerous even if authenticated. Always use server-side templates.
**Prevention:** Avoid generic "send email" endpoints exposed to the frontend. Use specific endpoints with strictly typed parameters (e.g., `send-welcome`, `send-alert`).
