## 2024-10-24 - [Add Express Payload Limits]
**Vulnerability:** Missing strict payload size limits on incoming JSON and URL-encoded requests (DoS risk).
**Learning:** Default Express `body-parser` limits are generous (100kb+). Explicitly limiting these to tighter values (like 10kb) for specific APIs is a standard security practice to prevent DoS via large payloads.
**Prevention:** Always define explicit limits when configuring `express.json()` and `express.urlencoded()`.
