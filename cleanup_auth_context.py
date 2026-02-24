import re

with open('src/contexts/FirebaseAuthContext.tsx', 'r') as f:
    content = f.read()

# Pattern for the logic block start
start_marker = "// 2FA Verification Logic (Integrated to prevent race conditions)"

# Count occurrences
count = content.count(start_marker)
print(f"Found {count} logic blocks.")

if count > 1:
    # Find the first occurrence
    first_start = content.find(start_marker)

    # Find the start of the second occurrence
    second_start = content.find(start_marker, first_start + len(start_marker))

    # We want to remove everything from first_start up to second_start
    # But wait, we need to check if the second block is the correct one.
    # The broken block has `sessionStorage.getItem();`

    broken_snippet = "sessionStorage.getItem();"
    if broken_snippet in content[first_start:second_start]:
        print("First block is broken. Removing it.")
        content = content[:first_start] + content[second_start:]
    else:
        print("First block seems okay? checking second.")
        # If second block is broken?
        # Unlikely based on my manual review, but let's be safe.
        pass

    with open('src/contexts/FirebaseAuthContext.tsx', 'w') as f:
        f.write(content)
    print("Cleanup successful.")
else:
    print("Only 1 block found. Checking if it is broken.")
    if "sessionStorage.getItem();" in content:
        print("The only block is broken! Replacing it with correct one.")

        correct_block = r"""// 2FA Verification Logic (Integrated to prevent race conditions)
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

        # Find start and where it ends (at logger.setUserId)
        start_pos = content.find(start_marker)
        end_marker = "logger.setUserId(uid);"
        end_pos = content.find(end_marker)

        content = content[:start_pos] + correct_block + "\n            " + content[end_pos:]

        with open('src/contexts/FirebaseAuthContext.tsx', 'w') as f:
            f.write(content)
        print("Replaced broken block.")
