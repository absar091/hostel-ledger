import re

with open('src/contexts/FirebaseAuthContext.tsx', 'r') as f:
    content = f.read()

# 1. Remove the separate check2FAStatus useEffect
start_marker = "// Check 2FA verification status (Session OR Trusted Device)"
end_marker = "check2FAStatus();\n  }, [user?.uid, user?.is2FAEnabled]);"

if start_marker in content and end_marker in content:
    start_pos = content.find(start_marker)
    end_pos = content.find(end_marker) + len(end_marker)
    content = content[:start_pos] + content[end_pos:]
    print("Removed separate useEffect.")
else:
    print("Warning: Could not find separate useEffect to remove. It might have been removed or the file content is different.")

# 2. Add 'let isInitialLoad = true;' at start of subscription useEffect
sub_marker = "// Effect to handle Real-time User Profile Subscription"
if sub_marker in content:
    pattern = r"(// Effect to handle Real-time User Profile Subscription\s+useEffect\(\(\) => \{\s+let unsubscribeUser: \(\) => void;)"
    replacement = r"\1\n    let isInitialLoad = true;"
    # Check if already added to avoid duplication
    if "let isInitialLoad = true;" not in content:
        content = re.sub(pattern, replacement, content)
        print("Added isInitialLoad variable.")
    else:
        print("isInitialLoad already present.")

# 3. Inject 2FA logic in onValue
# We need to replace setUser(userProfile) with the logic block.
# Use raw strings for the replacement code to handle backticks correctly.

logic_code = r"""            // 2FA Verification Logic (Integrated to prevent race conditions)
            let verified = is2FAVerified;
            if (userProfile.is2FAEnabled) {
                // 1. Session Check (Sync)
                const isSessionVerified = sessionStorage.getItem(`2fa_verified_${uid}`);
                if (isSessionVerified === 'true') {
                    verified = true;
                } else {
                    // 2. Trusted Device Check (Async - only on initial load)
                    const deviceToken = localStorage.getItem(`device_token_${uid}`);
                    if (deviceToken && isInitialLoad) {
                       try {
                           const result = await callSecureApi('/api/2fa/check-trust', { deviceToken });
                           if (result.success && result.trusted) {
                               verified = true;
                               sessionStorage.setItem(`2fa_verified_${uid}`, 'true');
                           } else {
                               localStorage.removeItem(`device_token_${uid}`);
                               verified = false;
                           }
                       } catch (e) {
                           console.error('Failed to verify trust', e);
                           verified = false;
                       }
                    } else if (!deviceToken) {
                        verified = false;
                    }
                }
            }

            setIs2FAVerified(verified);
            isInitialLoad = false;
            setUser(userProfile);"""

target = "setUser(userProfile);\n            logger.setUserId(uid);"
replacement = logic_code + "\n            logger.setUserId(uid);"

if target in content:
    content = content.replace(target, replacement)
    print("Injected 2FA logic.")
elif "let verified = is2FAVerified;" in content:
    print("2FA logic seems already injected.")
else:
    print("Error: Could not find target to inject logic. Content might have changed.")

with open('src/contexts/FirebaseAuthContext.tsx', 'w') as f:
    f.write(content)

print("Context updated.")
