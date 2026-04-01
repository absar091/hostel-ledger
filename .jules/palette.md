## 2024-04-01 - Missing Async Feedback on Core Forms
**Learning:** In standard data forms like user profiles, users often trigger multiple rapid saves if there is no explicit visual feedback (like a disabled state with a spinner) during async operations.
**Action:** Always wrap form submission buttons in `isLoading` states that explicitly disable the button and show a spinner to prevent duplicate submissions and provide immediate feedback.
