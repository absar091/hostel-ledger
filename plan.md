1. **Add `isValidFirebaseId` validation for `targetId` in `backend-server/routes/userRoutes.js`**.
   - As per `SENTINEL'S JOURNAL` (and codebase standards), user-provided referential IDs must be explicitly validated before use, to avoid malicious formatted payloads.
   - The `/report` endpoint accepts a `targetId` from the request body. While it pushes a new `reports` entry rather than using `targetId` in a path directly, the payload is saved. The instructions note: `Untrusted client-provided referential IDs (e.g., targetId in report endpoints) must be explicitly validated using constraints like isValidFirebaseId upon receipt at the endpoint boundary before being saved to the database, preventing maliciously formatted payloads from being stored or used in secondary contexts.`
   - I will import `isValidFirebaseId` from `../utils/validation` and use it in `router.post('/report', ...)` to validate `targetId`.

2. **Run tests & linting (Verification)**
   - Run `pnpm lint` and `pnpm test` to ensure there are no regressions.
   - Use `git diff --staged` to verify the exact changes.

3. **Complete pre-commit steps to ensure proper testing, verification, review, and reflection are done.**
   - Run `pre_commit_instructions`.

4. **Submit**
   - Use `submit` to push the changes.
