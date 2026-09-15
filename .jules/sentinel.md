## 2026-09-15 - Missing Authentication on Sensitive Endpoints
**Vulnerability:** Several sensitive endpoints (`/api/send-temp-member-alert`, `/api/send-welcome`, `/api/send-external-invitation`, `/api/push-*`) were missing the `authenticate` middleware, allowing unauthorized access and potential server crashes due to `req.user` being undefined.
**Learning:** In Express, routes that rely on `req.user` must explicitly declare the authentication middleware in their route definition. Global rate limiters (`emailLimiter`) do not inherently provide authentication.
**Prevention:** Always verify that endpoints accessing user-specific data or performing sensitive actions have the appropriate authentication middleware applied.
