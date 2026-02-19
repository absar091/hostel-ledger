## 2026-02-14 - Admin Endpoints Exposed
**Vulnerability:** Administrative endpoints (`cleanup-temp-members`, `cleanup-unverified-users`) were protected only by authentication (valid user token), allowing any logged-in user to trigger destructive server maintenance tasks.
**Learning:** Middleware chaining (`app.use('/api', auth)`) can obscure authorization gaps if endpoints don't implement their own specific role checks. Relying solely on "is authenticated" is insufficient for privileged actions.
**Prevention:** Always implement role-based access control (RBAC) or specific secret keys (`x-admin-key`) for administrative endpoints. Explicitly exempt them from user-auth if they are intended for system-level access (cron jobs).
