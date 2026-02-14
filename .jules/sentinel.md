# SENTINEL'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-01-25 - Unused Maintenance Endpoints & Dead Code
**Vulnerability:** Backend endpoints for administrative cleanup (`/api/cleanup-temp-members`, `/api/cleanup-unverified-users`) were exposed to any authenticated user. While unused by the frontend, they allowed potential DoS or data manipulation. Additionally, an unused file `src/lib/jwt.ts` contained a hardcoded secret.
**Learning:** "Dead" code and unused endpoints are often overlooked in security reviews but remain active attack vectors. Authentication (valid user) is not sufficient for administrative tasks; specific authorization is required.
**Prevention:** Remove unused endpoints or secure them with specific authorization (e.g., API Keys or Admin roles). Audit codebase for "dead" files that may contain secrets.
