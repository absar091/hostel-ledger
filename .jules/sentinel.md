## 2024-05-24 - Unvalidated Target IDs in Report Endpoint
**Vulnerability:** The `/api/user/report` endpoint accepted an unvalidated `targetId` directly from the client request body and interpolated it into database operations, posing a risk of path traversal or NoSQL injection in the Realtime Database.
**Learning:** The validation logic checked for the presence of the ID and ensuring `targetType` was either 'user' or 'group', but lacked a structural validation check for the `targetId` itself using established utilities.
**Prevention:** Always explicitly validate untrusted referential IDs (e.g., `targetId`, `groupId`, `userId`) upon receipt at the endpoint boundary using established constraint functions like `isValidFirebaseId` before utilizing them in database paths or queries.
