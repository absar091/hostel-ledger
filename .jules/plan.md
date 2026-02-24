1.  *Update `Group` interface in `src/contexts/FirebaseDataContext.tsx`.*
    - Add `status?: 'invited' | 'joined' | 'archived' | string;` to the `Group` interface to support the status field from Firebase.

2.  *Filter invited groups in `src/contexts/FirebaseDataContext.tsx`.*
    - Locate the `unsubscribeGroups` listener inside the `FirebaseDataProvider`.
    - In the `groupsList` mapping, ensure `status` is passed from the snapshot value.
    - Add a `.filter()` method to exclude groups where `status === 'invited'`.
    - This ensures that users do not see groups they have been invited to (but not accepted) in their main dashboard list.

3.  *Complete pre commit steps*
    - Complete pre commit steps to make sure proper testing, verification, review and reflection are done.

4.  *Submit the change.*
    - Once verified, submit the changes.
