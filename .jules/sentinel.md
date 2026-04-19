## 2025-02-14 - Prevent Reverse Tabnabbing
**Vulnerability:** External links with target="_blank" missing rel="noopener noreferrer"
**Learning:** Found in `src/pages/CreateGroup.tsx` and `src/components/CreateGroupSheet.tsx` which can allow newly opened tabs to manipulate the window.opener API to redirect the original application page to malicious destinations.
**Prevention:** Always add rel="noopener noreferrer" whenever using target="_blank" for external links.
