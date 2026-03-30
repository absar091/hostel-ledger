## 2024-03-30 - Dynamic ARIA labels for AI inputs
**Learning:** Icon-only AI voice recording buttons require dynamic ARIA labels (e.g., "Start voice recording" / "Stop voice recording") to accurately reflect the active listening state for screen readers.
**Action:** Always map the boolean `isListening` state to descriptive ARIA labels and ensure the inner decorative icons (`<Mic>`, `<MicOff>`) are hidden with `aria-hidden="true"`.
