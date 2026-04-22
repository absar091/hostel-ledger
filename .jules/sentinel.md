## 2024-05-20 - Missing noopener noreferrer on target="_blank"
**Vulnerability:** External links using target="_blank" were missing the rel="noopener noreferrer" attributes.
**Learning:** This is a common security/performance issue where the newly opened page can access the opening page's window via window.opener, potentially leading to malicious redirects.
**Prevention:** Always pair target="_blank" with rel="noopener noreferrer".
