## 2025-02-23 - Replace O(N) nested loop with O(N) map lookup
**Learning:** getTransactionsByGroup in FirebaseDataContext.tsx was filtering the entire transactions array on every call, making it O(N). When called frequently (like in GroupDetail.tsx), this causes significant performance overhead.
**Action:** Used useMemo to build a Map<groupId, Transaction[]> indexing all transactions by group ID, reducing the getTransactionsByGroup operation from O(N) to O(1) hash map lookup.
